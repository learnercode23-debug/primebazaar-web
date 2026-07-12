// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerWallet from '@/models/SellerWallet'
import SellerLedger from '@/models/SellerLedger'
import SellerPayout from '@/models/SellerPayout'
import SellerBankAccount from '@/models/SellerBankAccount'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { sellerId, referenceId, method, notes, amount } = await req.json()
    if (!sellerId || !referenceId) {
      return NextResponse.json({ error: 'sellerId and referenceId are required' }, { status: 400 })
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'A positive payout amount is required' }, { status: 400 })
    }

    const wallet = await SellerWallet.findOne({ seller: sellerId })
    if (!wallet || wallet.availableBalance < 1) {
      return NextResponse.json({ error: 'No available balance for this seller' }, { status: 400 })
    }

    // A manual payout settles the seller's FULL available balance. Marking all
    // 'available' ledger entries paid while debiting only a partial amount would
    // strand the remainder forever, so we require the amount to cover it in full.
    if (amt < wallet.availableBalance - 0.01) {
      return NextResponse.json({
        error: `Manual payout settles the full available balance. Enter Rs.${wallet.availableBalance.toFixed(2)}.`,
      }, { status: 400 })
    }
    const payoutAmount = wallet.availableBalance

    // Get bank details if available
    const bank = await SellerBankAccount.findOne({ seller: sellerId }).lean()
    const seller = await User.findById(sellerId).lean()

    // Mark all available ledger entries as paid
    const entries = await SellerLedger.find({ seller: sellerId, status: 'available' }).lean()
    const entryIds = entries.map((e) => e._id)

    // Create payout record
    const payout = await SellerPayout.create({
      seller:            sellerId,
      amount:            payoutAmount,
      bankName:          bank?.bankName || method || 'Manual',
      accountHolderName: bank?.accountHolderName || seller?.name || '',
      accountLast4:      bank?.accountLast4 || '0000',
      status:            'success',
      referenceId:       referenceId.trim(),
      notes:             notes || `Manual payout via ${method || 'transfer'}`,
      initiatedAt:       new Date(),
      completedAt:       new Date(),
      initiatedBy:       admin._id,
      ledgerEntries:     entryIds,
    })

    // Mark ledger entries as paid
    if (entryIds.length > 0) {
      await SellerLedger.updateMany(
        { _id: { $in: entryIds } },
        { status: 'paid', paidAt: new Date(), payout: payout._id }
      )
    }

    // Deduct from wallet
    await SellerWallet.findOneAndUpdate(
      { seller: sellerId },
      {
        $inc: {
          availableBalance: -payoutAmount,
          paidOutBalance:    payoutAmount,
        },
        lastSettledAt: new Date(),
      }
    )

    return NextResponse.json({ success: true, message: `Rs.${payoutAmount} marked as paid to ${seller?.name}` })
  } catch (err) {
    console.error('Manual payout error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
