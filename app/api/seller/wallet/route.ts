export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerWallet from '@/models/SellerWallet'
import SellerLedger from '@/models/SellerLedger'
import SellerPayout from '@/models/SellerPayout'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const wallet = await SellerWallet.findOne({ seller: user._id }).lean() || {
    totalEarned: 0, pendingBalance: 0, availableBalance: 0, paidOutBalance: 0,
  }

  // Recent ledger entries (last 20)
  const ledger = await SellerLedger.find({ seller: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  // Recent payouts (last 10)
  const payouts = await SellerPayout.find({ seller: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  // Next payout date — first Monday of next week
  const next = new Date()
  next.setDate(next.getDate() + ((8 - next.getDay()) % 7 || 7))
  next.setHours(10, 0, 0, 0)

  return NextResponse.json({
    success: true,
    data: { wallet, ledger, payouts, nextPayoutDate: next },
  })
}
