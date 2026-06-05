// @ts-nocheck
/**
 * Seller Payout / Settlement Engine
 *
 * Flow:
 *  1. Order delivered → createLedgerEntry() called from order status route
 *  2. Every day: releaseAvailableEarnings() moves entries past return window
 *     from "pending" → "available" and credits seller's availableBalance
 *  3. Admin triggers runSettlement() → creates payout for each seller
 *     with available balance > minimum threshold
 *  4. Payout provider transfers funds; webhook updates payout status
 *
 * LEGAL NOTE:
 *  Holding and disbursing third-party funds requires regulatory approval
 *  (e.g. Payment Aggregator license in India, PSP license in Nepal).
 *  Consult a lawyer before going live with real money.
 */

import { connectDB } from './mongodb'
import Order from '@/models/Order'
import SellerWallet from '@/models/SellerWallet'
import SellerLedger from '@/models/SellerLedger'
import SellerPayout from '@/models/SellerPayout'
import SellerBankAccount from '@/models/SellerBankAccount'
import Category from '@/models/Category'
import { resolveCommissionRate, calculateCommission } from './commissionEngine'

const COLLECTION_FEE_PCT  = 2      // 2% payment gateway cost passed to seller
const RETURN_WINDOW_DAYS  = 7      // earnings released after 7 days post-delivery
const MIN_PAYOUT_AMOUNT   = 100    // minimum Rs.100 / $1 to trigger a payout

// ── 1. Create ledger entry when an order item is delivered ────────────────────

export async function createLedgerEntry(orderId: string) {
  await connectDB()

  const order = await Order.findById(orderId)
    .populate({ path: 'items.product', select: 'category' })
    .lean()

  if (!order || order.status !== 'delivered') return

  for (const item of order.items) {
    const sellerId = item.seller?.toString()
    if (!sellerId) continue

    // Check if ledger entry already exists for this order+seller
    const existing = await SellerLedger.findOne({ order: orderId, seller: sellerId })
    if (existing) continue

    // Resolve commission rate using the priority engine (product → category → seller → global)
    const product = item.product as unknown as { _id?: string; category?: string }
    const resolved = await resolveCommissionRate(
      product?._id?.toString() || item.product?.toString() || '',
      product?.category?.toString() || null,
      sellerId
    )
    const commissionRate = resolved.rate

    const grossAmount   = item.price * item.quantity
    const commissionFee = calculateCommission(grossAmount, item.quantity, resolved)
    const collectionFee = Math.round(grossAmount * COLLECTION_FEE_PCT / 100 * 100) / 100
    const netEarning    = Math.round((grossAmount - commissionFee - collectionFee) * 100) / 100

    // Earnings available after return window
    const deliveredAt  = order.deliveredAt || new Date()
    const availableAt  = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    await SellerLedger.create({
      seller:         sellerId,
      order:          orderId,
      orderNumber:    order.orderNumber,
      itemTitle:      item.title,
      grossAmount,
      commissionRate,
      commissionFee,
      collectionFee,
      netEarning,
      status:         'pending',
      availableAt,
    })

    // Update seller wallet — add to totalEarned and pendingBalance
    await SellerWallet.findOneAndUpdate(
      { seller: sellerId },
      { $inc: { totalEarned: netEarning, pendingBalance: netEarning } },
      { upsert: true, new: true }
    )
  }
}

// ── 2. Release earnings past return window (run daily via cron/API) ───────────

export async function releaseAvailableEarnings() {
  await connectDB()

  const now = new Date()

  // Find all pending entries whose return window has passed
  const entries = await SellerLedger.find({
    status:      'pending',
    availableAt: { $lte: now },
  }).lean()

  let released = 0
  for (const entry of entries) {
    await SellerLedger.findByIdAndUpdate(entry._id, { status: 'available' })

    // Move from pendingBalance → availableBalance
    await SellerWallet.findOneAndUpdate(
      { seller: entry.seller },
      {
        $inc: {
          pendingBalance:   -entry.netEarning,
          availableBalance:  entry.netEarning,
        },
      }
    )
    released++
  }

  return { released }
}

// ── 3. Settlement run — creates payouts for all eligible sellers ──────────────

export async function runSettlement(adminId: string) {
  await connectDB()

  // Get all sellers with available balance above minimum
  const wallets = await SellerWallet.find({
    availableBalance: { $gte: MIN_PAYOUT_AMOUNT },
  }).lean()

  const payouts = []
  const errors  = []

  for (const wallet of wallets) {
    try {
      const sellerId = wallet.seller.toString()

      // Get verified default bank account
      const bankAccount = await SellerBankAccount.findOne({
        seller:     sellerId,
        isDefault:  true,
        kycStatus:  'verified',
      }).lean()

      if (!bankAccount) {
        errors.push({ seller: sellerId, reason: 'No verified bank account' })
        continue
      }

      // Get all available ledger entries for this seller
      const entries = await SellerLedger.find({
        seller: sellerId,
        status: 'available',
      }).lean()

      if (entries.length === 0) continue

      const totalAmount = entries.reduce((sum, e) => sum + e.netEarning, 0)
      const roundedAmount = Math.round(totalAmount * 100) / 100

      // Create payout record
      const payout = await SellerPayout.create({
        seller:            sellerId,
        amount:            roundedAmount,
        bankName:          bankAccount.bankName,
        accountHolderName: bankAccount.accountHolderName,
        accountLast4:      bankAccount.accountLast4,
        status:            'initiated',
        ledgerEntries:     entries.map((e) => e._id),
        initiatedAt:       new Date(),
        initiatedBy:       adminId,
      })

      // Mark ledger entries as paid
      await SellerLedger.updateMany(
        { _id: { $in: entries.map((e) => e._id) } },
        { status: 'paid', paidAt: new Date(), payout: payout._id }
      )

      // Deduct from wallet
      await SellerWallet.findOneAndUpdate(
        { seller: sellerId },
        {
          $inc: {
            availableBalance: -roundedAmount,
            paidOutBalance:    roundedAmount,
          },
          lastSettledAt: new Date(),
        }
      )

      // ── PAYOUT PROVIDER INTEGRATION ──────────────────────────────────────
      // In production, call your payout provider API here.
      // Examples:
      //   • eSewa B2C: POST https://esewa.com.np/api/epay/b2c
      //   • Khalti: POST https://khalti.com/api/v2/payout/
      //   • Stripe Connect: stripe.transfers.create(...)
      //
      // For now we run in DEMO mode — mark as success immediately.
      // Replace this block with real API call when ready for production.
      // ─────────────────────────────────────────────────────────────────────
      const isDemoMode = !process.env.PAYOUT_API_KEY

      if (isDemoMode) {
        await SellerPayout.findByIdAndUpdate(payout._id, {
          status:      'success',
          referenceId: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
          completedAt: new Date(),
          notes:       'Demo mode — no real transfer made. Add PAYOUT_API_KEY to enable live payouts.',
        })
      } else {
        // TODO: Integrate real payout provider
        // const result = await callPayoutProvider(bankAccount, roundedAmount)
        // await SellerPayout.findByIdAndUpdate(payout._id, {
        //   status: result.success ? 'success' : 'failed',
        //   referenceId: result.referenceId,
        //   failureReason: result.error,
        //   completedAt: new Date(),
        // })
      }

      payouts.push(payout)
    } catch (err) {
      errors.push({ seller: wallet.seller.toString(), reason: String(err) })
    }
  }

  return { payoutsCreated: payouts.length, errors }
}

// ── 4. Fee breakdown calculator (for UI display) ─────────────────────────────

export function calculateEarning(
  grossAmount: number,
  commissionRate: number
): { commissionFee: number; collectionFee: number; netEarning: number } {
  const commissionFee = Math.round(grossAmount * commissionRate / 100 * 100) / 100
  const collectionFee = Math.round(grossAmount * COLLECTION_FEE_PCT / 100 * 100) / 100
  const netEarning    = Math.round((grossAmount - commissionFee - collectionFee) * 100) / 100
  return { commissionFee, collectionFee, netEarning }
}
