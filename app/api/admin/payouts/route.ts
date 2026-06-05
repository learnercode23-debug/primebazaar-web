export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerWallet from '@/models/SellerWallet'
import SellerPayout from '@/models/SellerPayout'
import SellerBankAccount from '@/models/SellerBankAccount'


export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const [wallets, payouts] = await Promise.all([
    SellerWallet.find().populate('seller', 'name email').sort({ availableBalance: -1 }).lean(),
    SellerPayout.find().populate('seller', 'name email').sort({ createdAt: -1 }).limit(50).lean(),
  ])

  // Get bank account status per seller — use _id after populate
  const sellerIds = wallets.map((w) => (w.seller as unknown as { _id: { toString(): string } })?._id?.toString() || String(w.seller))
  // Fetch all bank accounts (not just isDefault) — pick verified first, then any
  const bankAccounts = await SellerBankAccount.find({ seller: { $in: sellerIds } })
    .select('seller bankName accountLast4 accountHolderName mobileWallet walletType kycStatus isVerified isDefault')
    .sort({ kycStatus: 1, isDefault: -1 }) // verified + default first
    .lean()
  // Keep only the best account per seller (verified > default > first)
  const bankMap = new Map<string, typeof bankAccounts[0]>()
  for (const b of bankAccounts) {
    const sid = b.seller.toString()
    if (!bankMap.has(sid) || b.kycStatus === 'verified' || b.isDefault) {
      bankMap.set(sid, b)
    }
  }

  const enrichedWallets = wallets.map((w) => {
    const sellerId = (w.seller as unknown as { _id: { toString(): string } })?._id?.toString() || String(w.seller)
    return {
      ...w,
      sellerId,
      bank: bankMap.get(sellerId) || null,
    }
  })

  const platformStats = {
    totalPaidOut:    payouts.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0),
    totalPending:    wallets.reduce((s, w) => s + w.pendingBalance, 0),
    totalAvailable:  wallets.reduce((s, w) => s + w.availableBalance, 0),
    sellersEligible: wallets.filter((w) => w.availableBalance >= 100).length,
  }

  return NextResponse.json({ success: true, data: { wallets: enrichedWallets, payouts, platformStats } })
}
