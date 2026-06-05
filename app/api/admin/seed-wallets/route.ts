// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/admin/seed-wallets
 * Seeds demo wallet data for testing the payout dashboard:
 *  - Adds availableBalance directly to each seller's wallet
 *  - Creates a verified bank account for each seller
 * After seeding, click "Run Settlement" to generate payouts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import SellerWallet from '@/models/SellerWallet'
import SellerLedger from '@/models/SellerLedger'
import SellerBankAccount from '@/models/SellerBankAccount'

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAuthUser(req)
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const sellers = await User.find({ role: 'seller', isActive: true }).select('_id name email').lean()
    if (sellers.length === 0) {
      return NextResponse.json({ success: false, error: 'No sellers found' }, { status: 400 })
    }

    const pastDate = new Date(Date.now() - 10 * 24 * 3600 * 1000) // 10 days ago
    let seeded = 0

    for (const seller of sellers) {
      const sellerId = seller._id.toString()
      const earning  = Math.round((800 + Math.random() * 4200) * 100) / 100

      // Directly set availableBalance (bypass 7-day return window for demo)
      await SellerWallet.findOneAndUpdate(
        { seller: seller._id },
        {
          $setOnInsert: { seller: seller._id, pendingBalance: 0, paidOutBalance: 0 },
          $inc: { totalEarned: earning, availableBalance: earning },
        },
        { upsert: true }
      )

      // Create a demo ledger entry already in 'available' status
      const alreadySeeded = await SellerLedger.findOne({ seller: seller._id, orderNumber: 'DEMO-SEED' })
      if (!alreadySeeded) {
        await SellerLedger.create({
          seller:        seller._id,
          order:         '000000000000000000000001',
          orderNumber:   'DEMO-SEED',
          itemTitle:     'Demo seed earnings',
          grossAmount:   Math.round(earning / 0.88 * 100) / 100,
          commissionRate: 10,
          commissionFee: Math.round(earning * 0.10 * 100) / 100,
          collectionFee: Math.round(earning * 0.02 * 100) / 100,
          netEarning:    earning,
          status:        'available',
          availableAt:   pastDate,
        })
      }

      // Create verified bank account if none exists
      const existingBank = await SellerBankAccount.findOne({ seller: seller._id })
      if (!existingBank) {
        await SellerBankAccount.create({
          seller:             seller._id,
          bankName:           'Nepal Bank Ltd',
          accountHolderName:  seller.name,
          accountLast4:       String(1000 + seeded).slice(-4),
          ifscCode:           'NBL0000001',
          isDefault:          true,
          kycStatus:          'verified',
          isVerified:         true,
          walletType:         'bank',
        })
      } else if (existingBank.kycStatus !== 'verified') {
        await SellerBankAccount.findByIdAndUpdate(existingBank._id, {
          kycStatus:  'verified',
          isVerified: true,
        })
      }

      seeded++
    }

    return NextResponse.json({
      success: true,
      message: `✓ Seeded ${seeded} sellers with available balance and verified bank accounts. Now click "Run Settlement"!`,
    })
  } catch (err) {
    console.error('Seed wallets error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
