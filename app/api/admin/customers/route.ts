export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'

function maskEmail(email?: string) {
  if (!email) return ''
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 1)}***@${domain}`
}

type Segment = 'champions' | 'loyal' | 'promising' | 'at_risk' | 'hibernating' | 'lost'

function segmentOf(recencyDays: number, freq: number): Segment {
  if (recencyDays <= 14 && freq >= 5) return 'champions'
  if (recencyDays <= 30 && freq >= 3) return 'loyal'
  if (recencyDays <= 21) return 'promising'
  if (recencyDays <= 60 && freq >= 2) return 'at_risk'
  if (recencyDays <= 90) return 'hibernating'
  return 'lost'
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()

    const agg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: '$user', orders: { $sum: 1 }, ltv: { $sum: '$totalAmount' }, last: { $max: '$createdAt' } } },
    ])

    const userIds = agg.map(a => a._id).filter(Boolean)
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean<Array<{ _id: { toString(): string }; name?: string; email?: string }>>()
    const umap = new Map(users.map(u => [u._id.toString(), u]))

    const now = Date.now()
    const customers = agg.map(a => {
      const recencyDays = Math.max(0, Math.floor((now - new Date(a.last).getTime()) / 86400000))
      const seg = segmentOf(recencyDays, a.orders)
      const u: { name?: string; email?: string } = umap.get(a._id?.toString()) || {}
      return {
        name: u.name || 'Unknown',
        email: maskEmail(u.email),
        segment: seg,
        ltv: Math.round(a.ltv),
        orders: a.orders,
        lastDays: recencyDays,
      }
    }).sort((x, y) => y.ltv - x.ltv)

    const keys: Segment[] = ['champions', 'loyal', 'promising', 'at_risk', 'hibernating', 'lost']
    const segments = keys.map(key => {
      const members = customers.filter(c => c.segment === key)
      const count = members.length
      const avgLTV = count ? Math.round(members.reduce((s, c) => s + c.ltv, 0) / count) : 0
      const avgFreq = count ? +(members.reduce((s, c) => s + c.orders, 0) / count).toFixed(1) : 0
      const avgRecencyDays = count ? Math.round(members.reduce((s, c) => s + c.lastDays, 0) / count) : 0
      return { key, count, avgLTV, avgFreq, avgRecencyDays }
    })

    return NextResponse.json({ data: { segments, customers } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
