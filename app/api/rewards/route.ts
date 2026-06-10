export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Review from '@/models/Review'
import User from '@/models/User'

const POINTS_PER_RS = 1 / 20      // 1 point per Rs.20 spent
const POINTS_PER_REVIEW = 50
const POINTS_PER_REFERRAL = 200

interface HistoryItem { date: Date | string; desc: string; pts: number; type: 'earn' | 'redeem' }

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const [orders, reviews, referralsCompleted] = await Promise.all([
      Order.find({ user: user._id, paymentStatus: 'paid' }).select('orderNumber totalAmount createdAt').sort({ createdAt: -1 }).lean(),
      Review.find({ user: user._id }).select('createdAt').sort({ createdAt: -1 }).lean(),
      // Count referred users who completed a paid order
      (async () => {
        const referred = await User.find({ referredBy: user._id }).select('_id').lean()
        const ids = referred.map(r => r._id)
        if (!ids.length) return 0
        const done = await Order.distinct('user', { user: { $in: ids }, paymentStatus: 'paid' })
        return done.length
      })(),
    ])

    const history: HistoryItem[] = []
    let balance = 0

    for (const o of orders) {
      const pts = Math.floor((o.totalAmount || 0) * POINTS_PER_RS)
      if (pts <= 0) continue
      balance += pts
      history.push({ date: o.createdAt, desc: `Purchase — Order ${o.orderNumber || ''}`.trim(), pts, type: 'earn' })
    }
    for (const r of reviews) {
      balance += POINTS_PER_REVIEW
      history.push({ date: r.createdAt, desc: 'Product review posted', pts: POINTS_PER_REVIEW, type: 'earn' })
    }
    if (referralsCompleted > 0) {
      const pts = referralsCompleted * POINTS_PER_REFERRAL
      balance += pts
      history.push({ date: new Date(), desc: `${referralsCompleted} referral${referralsCompleted === 1 ? '' : 's'} completed`, pts, type: 'earn' })
    }

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ data: { balance, history: history.slice(0, 30) } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
