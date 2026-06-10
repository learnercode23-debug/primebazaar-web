export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import FraudReview from '@/models/FraudReview'

function maskEmail(email?: string) {
  if (!email) return ''
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 1)}***@${domain}`
}

interface Factor { label: string; weight: number; signal: 'bad' | 'warn' | 'ok' }

interface LeanOrder {
  _id: { toString(): string }
  totalAmount: number
  createdAt: string | Date
  paymentStatus: string
  paymentMethod?: string
  shippingAddress?: { phone?: string; city?: string }
  user?: { _id?: { toString(): string }; name?: string; email?: string; createdAt?: string | Date }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const orders = await Order.find({ createdAt: { $gte: since } })
      .populate('user', 'name email createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean<LeanOrder[]>()

    // Average paid order value (baseline for the "high value" signal)
    const avgAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
    ])
    const avgOrder = avgAgg[0]?.avg || 0

    // Velocity + linked-account maps from the fetched window
    const byUser = new Map<string, number[]>()       // userId -> order timestamps (ms)
    const failByUser = new Map<string, number>()      // userId -> failed/pending payment count
    const byPhone = new Map<string, Set<string>>()    // phone -> set of userIds
    for (const o of orders) {
      const uid = o.user?._id?.toString()
      if (uid) {
        if (!byUser.has(uid)) byUser.set(uid, [])
        byUser.get(uid)!.push(new Date(o.createdAt).getTime())
        if (o.paymentStatus === 'pending' || o.paymentStatus === 'failed') failByUser.set(uid, (failByUser.get(uid) || 0) + 1)
      }
      const phone = o.shippingAddress?.phone
      if (phone && uid) {
        if (!byPhone.has(phone)) byPhone.set(phone, new Set())
        byPhone.get(phone)!.add(uid)
      }
    }

    const reviews = await FraudReview.find().lean<Array<{ order: { toString(): string }; status: string }>>()
    const reviewMap = new Map(reviews.map(r => [r.order.toString(), r.status]))

    const scored = orders.map(o => {
      const uid = o.user?._id?.toString()
      const t = new Date(o.createdAt).getTime()
      const factors: Factor[] = []

      // New account (order placed within 48h of signup)
      const acctMs = o.user?.createdAt ? new Date(o.user.createdAt).getTime() : null
      const acctAgeDays = acctMs != null ? Math.floor((t - acctMs) / 86400000) : null
      if (acctAgeDays != null && acctAgeDays <= 2) factors.push({ label: `New account (<48h)`, weight: 30, signal: 'bad' })
      else if (acctAgeDays != null && acctAgeDays <= 14) factors.push({ label: `Account age ${acctAgeDays}d`, weight: 10, signal: 'warn' })

      // High value vs average
      if (avgOrder > 0 && o.totalAmount > 3 * avgOrder) factors.push({ label: `Order value > 3× avg`, weight: 25, signal: 'bad' })
      else if (avgOrder > 0 && o.totalAmount > 1.8 * avgOrder) factors.push({ label: `Above-average order value`, weight: 8, signal: 'warn' })

      // Velocity
      const times = uid ? byUser.get(uid) || [] : []
      const last1h = times.filter(x => Math.abs(x - t) <= 3600000).length
      const last24h = times.filter(x => Math.abs(x - t) <= 86400000).length
      if (last24h >= 5) factors.push({ label: `${last24h} orders in 24h`, weight: 20, signal: 'bad' })
      else if (last1h >= 3) factors.push({ label: `${last1h} orders in 1h`, weight: 12, signal: 'warn' })

      // Failed payments
      const fails = uid ? failByUser.get(uid) || 0 : 0
      if (fails >= 3) factors.push({ label: `${fails} unpaid/failed orders`, weight: 18, signal: 'bad' })
      else if (fails >= 1) factors.push({ label: `${fails} unpaid/failed order${fails === 1 ? '' : 's'}`, weight: 8, signal: 'warn' })

      // Linked accounts (same phone)
      const phone = o.shippingAddress?.phone
      const linked = phone ? Math.max(0, (byPhone.get(phone)?.size || 1) - 1) : 0
      if (linked > 2) factors.push({ label: `${linked} accounts share this phone`, weight: 20, signal: 'bad' })
      else if (linked > 0) factors.push({ label: `${linked} linked account${linked === 1 ? '' : 's'}`, weight: 8, signal: 'warn' })

      // Established customer reduces risk
      const totalUserOrders = times.length
      if (totalUserOrders >= 4) factors.push({ label: `${totalUserOrders} orders on record`, weight: -15, signal: 'ok' })

      const mlScore = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.weight, 0)))
      const risk = mlScore >= 80 ? 'critical' : mlScore >= 50 ? 'high' : 'medium'

      return {
        id: o._id.toString(),
        customer: o.user?.name || 'Unknown',
        email: maskEmail(o.user?.email),
        amount: Math.round(o.totalAmount),
        time: o.createdAt,
        paymentMethod: o.paymentMethod || '—',
        accountAgeDays: acctAgeDays,
        ordersOnRecord: totalUserOrders,
        city: o.shippingAddress?.city || '—',
        mlScore,
        risk,
        factors,
        velocity: { ordersLast1h: last1h, ordersLast24h: last24h, failedPayments: fails },
        linkedAccounts: linked,
        status: reviewMap.get(o._id.toString()) || 'pending',
      }
    }).filter(o => o.mlScore >= 25)
      .sort((a, b) => b.mlScore - a.mlScore)

    return NextResponse.json({ data: scored })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { id, status } = await req.json()
    if (!id || !['approved', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 })
    }
    await FraudReview.findOneAndUpdate(
      { order: id },
      { status, reviewedBy: admin._id, reviewedAt: new Date() },
      { upsert: true, new: true }
    )
    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
