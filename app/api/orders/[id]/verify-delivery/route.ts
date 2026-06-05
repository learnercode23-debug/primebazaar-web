export const dynamic = 'force-dynamic'
/**
 * POST /api/orders/:id/verify-delivery
 * Combined QR + OTP verification endpoint (Flipkart-style).
 *
 * Body: { scannedOrderId: string, otp: string }
 *
 * Validates:
 *   1. scannedOrderId matches params.id (QR is correct)
 *   2. otp matches order.deliveryCode
 *   3. Code is not locked and not expired
 *
 * On success: order → delivered, cash marked collected, agent recorded.
 * On wrong OTP: attempts++, lock after 5 wrong attempts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import SubOrder from '@/models/SubOrder'
import SellerLedger from '@/models/SellerLedger'
import SellerWallet from '@/models/SellerWallet'

const MAX_ATTEMPTS   = 5
const CODE_EXPIRY_MS = 24 * 60 * 60 * 1000  // 24 hours

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const { scannedOrderId, otp } = await req.json()

    // ── Step 1: QR validation ─────────────────────────────────────────────────
    if (!scannedOrderId || scannedOrderId.trim() !== params.id) {
      return NextResponse.json({
        success: false,
        error:   'Wrong order QR. Scan the correct order barcode.',
        code:    'QR_MISMATCH',
      }, { status: 400 })
    }

    if (!otp) {
      return NextResponse.json({ success: false, error: 'OTP required' }, { status: 400 })
    }

    // ── Step 2: Load order ────────────────────────────────────────────────────
    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (order.paymentMethod !== 'cod') {
      return NextResponse.json({ success: false, error: 'Not a COD order' }, { status: 400 })
    }
    if (!['shipped', 'out_for_delivery'].includes(order.status)) {
      return NextResponse.json({ success: false, error: `Order status is "${order.status}"` }, { status: 400 })
    }
    if (order.codCollected) {
      return NextResponse.json({ success: false, error: 'Already delivered and cash collected' }, { status: 400 })
    }

    // Locked check
    if (order.deliveryCodeLocked) {
      return NextResponse.json({
        success: false,
        error:   'Code is locked after too many wrong attempts. Contact admin to unlock.',
        locked:  true,
      }, { status: 403 })
    }

    // Code missing
    if (!order.deliveryCode) {
      return NextResponse.json({ success: false, error: 'No delivery code set. Contact admin.' }, { status: 400 })
    }

    // Expiry check (24 hours from generation)
    if (order.deliveryCodeGeneratedAt) {
      const expired = Date.now() - new Date(order.deliveryCodeGeneratedAt).getTime() > CODE_EXPIRY_MS
      if (expired) {
        return NextResponse.json({
          success: false,
          error:   'Delivery code has expired (>24h). Ask the customer to regenerate it.',
          expired: true,
        }, { status: 400 })
      }
    }

    // ── Step 3: OTP verification ──────────────────────────────────────────────
    if (order.deliveryCode !== otp.trim()) {
      order.deliveryCodeAttempts = (order.deliveryCodeAttempts || 0) + 1
      const attemptsLeft = MAX_ATTEMPTS - order.deliveryCodeAttempts

      if (attemptsLeft <= 0) {
        order.deliveryCodeLocked   = true
        order.deliveryCodeLockedAt = new Date()
        await order.save()
        return NextResponse.json({
          success:      false,
          error:        `Locked! ${MAX_ATTEMPTS} wrong attempts — contact admin to unlock.`,
          locked:       true,
          attemptsLeft: 0,
        }, { status: 403 })
      }

      await order.save()
      return NextResponse.json({
        success:      false,
        error:        `Wrong OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
        attemptsLeft,
      }, { status: 400 })
    }

    // ── Step 4: SUCCESS — mark delivered + cash collected ─────────────────────
    const now = new Date()
    const cashAmount = order.totalAmount  // codFee is already included in totalAmount

    order.status                  = 'delivered'
    order.deliveredAt             = now
    order.paymentStatus           = 'paid'
    order.codCollected            = true
    order.codCollectedAt          = now
    order.codCollectedAmount      = cashAmount
    order.codRemittanceStatus     = 'pending'
    order.deliveryCodeCollectedBy = user._id
    order.statusHistory.push({
      status:    'delivered',
      timestamp: now,
      note:      `OTP + QR verified by agent (userId: ${user._id}). Cash Rs.${cashAmount} collected.`,
    })
    await order.save()

    // Sync sub-orders
    await SubOrder.updateMany(
      { parentOrder: order._id, status: { $nin: ['cancelled', 'returned'] } },
      {
        $set:  { status: 'delivered', deliveredAt: now },
        $push: { statusHistory: { status: 'delivered', timestamp: now, note: 'Delivery verified by agent' } },
      }
    ).catch(console.error)

    // Credit sellers
    const COMMISSION = 0.10
    const sellerMap  = new Map<string, number>()
    for (const item of order.items) {
      const sid = item.seller?.toString()
      if (!sid) continue
      const net = Math.round(item.price * item.quantity * (1 - COMMISSION) * 100) / 100
      sellerMap.set(sid, (sellerMap.get(sid) || 0) + net)
    }
    for (const [sid, net] of Array.from(sellerMap.entries())) {
      await SellerLedger.create({
        seller: sid, order: order._id, orderNumber: order.orderNumber,
        itemTitle: 'COD delivery verified', grossAmount: Math.round(net / (1 - COMMISSION) * 100) / 100,
        commissionRate: 10, commissionFee: Math.round(net / (1 - COMMISSION) * COMMISSION * 100) / 100,
        collectionFee: 0, netEarning: net, status: 'pending',
        availableAt: new Date(now.getTime() + 7 * 86400 * 1000),
      }).catch(console.error)
      await SellerWallet.findOneAndUpdate(
        { seller: sid },
        { $inc: { pendingBalance: net, totalEarned: net }, $setOnInsert: { seller: sid } },
        { upsert: true }
      ).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: `✓ Delivery complete! Cash Rs.${cashAmount.toLocaleString()} collected.`,
      order: {
        orderNumber:      order.orderNumber,
        cashCollected:    cashAmount,
        deliveredAt:      now,
      },
    })
  } catch (err) {
    console.error('Verify delivery error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
