export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import Order from '@/models/Order'
import { ensureReferralCode } from '@/lib/referral'

const POINTS_PER_REFERRAL = 200

function shortName(name?: string) {
  if (!name) return 'A friend'
  const parts = name.trim().split(' ')
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const me = await User.findById(authUser._id)
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const code = await ensureReferralCode(me)

    const referred = await User.find({ referredBy: me._id }).select('name createdAt').sort({ createdAt: -1 }).lean<Array<{ _id: { toString(): string }; name?: string; createdAt: Date }>>()
    const referredIds = referred.map(r => r._id)
    const completedUserIds = referredIds.length
      ? await Order.distinct('user', { user: { $in: referredIds }, paymentStatus: 'paid' })
      : []
    const completedSet = new Set(completedUserIds.map(id => id.toString()))

    const referrals = referred.map(r => {
      const done = completedSet.has(r._id.toString())
      return {
        name: shortName(r.name),
        date: r.createdAt,
        status: done ? 'Completed' : 'Pending',
        earned: done ? POINTS_PER_REFERRAL : 0,
      }
    })
    const totalCompleted = referrals.filter(r => r.status === 'Completed').length

    return NextResponse.json({
      data: {
        code,
        referrals,
        totalReferred: referred.length,
        totalCompleted,
        totalEarned: totalCompleted * POINTS_PER_REFERRAL,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
