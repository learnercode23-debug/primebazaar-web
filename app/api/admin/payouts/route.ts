import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerWallet from '@/models/SellerWallet'
import SellerPayout from '@/models/SellerPayout'
import SellerBankAccount from '@/models/SellerBankAccount'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const [wallets, payouts] = await Promise.all([
    SellerWallet.find().populate('seller', 'name email').sort({ availableBalance: -1 }).lean(),
    SellerPayout.find().populate('seller', 'name email').sort({ createdAt: -1 }).limit(50).lean(),
  ])

  // Get bank account status per seller
  const sellerIds = wallets.map((w) => (w.seller as unknown as { _id: string })._id?.toString() || w.seller.toString())
  const bankAccounts = await SellerBankAccount.find({ seller: { $in: sellerIds }, isDefault: true }).lean()
  const bankMap = new Map(bankAccounts.map((b) => [b.seller.toString(), b]))

  const enrichedWallets = wallets.map((w) => ({
    ...w,
    bank: bankMap.get(w.seller.toString()) || null,
  }))

  const platformStats = {
    totalPaidOut:    payouts.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0),
    totalPending:    wallets.reduce((s, w) => s + w.pendingBalance, 0),
    totalAvailable:  wallets.reduce((s, w) => s + w.availableBalance, 0),
    sellersEligible: wallets.filter((w) => w.availableBalance >= 100).length,
  }

  return NextResponse.json({ success: true, data: { wallets: enrichedWallets, payouts, platformStats } })
}
