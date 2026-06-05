export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/:orderId/verify-code
 * Delivery agent enters the 5-digit code read out by the customer.
 *
 * SUCCESS → order marked "Delivered", cash collected, agent recorded.
 * WRONG   → attempts++ ; after 3 wrong attempts → order is LOCKED
 *           (admin must unlock via /api/admin/sub-orders/:id/unlock-code).
 *
 * Body: { code: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import SubOrder from '@/models/SubOrder'
import SellerLedger from '@/models/SellerLedger'
import SellerWallet from '@/models/SellerWallet'

const MAX_ATTEMPTS = 3

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const { code } = await req.json()
    if (!code) return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 })

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    // Must be a COD order that is shipped or out for delivery
    if (order.paymentMethod !== 'cod') {
      return NextResponse.json({ success: false, error: 'Not a COD order' }, { status: 400 })
    }
    if (!['shipped', 'out_for_delivery'].includes(order.status)) {
      return NextResponse.json({ success: false, error: `Order status is "${order.status}" — can only verify when shipped or out for delivery` }, { status: 400 })
    }
    if (order.codCollected) {
      return NextResponse.json({ success: false, error: 'Cash already collected for this order' }, { status: 400 })
    }
    if (order.deliveryCodeLocked) {
      return NextResponse.json({
        success: false,
        error: 'Code is locked after 3 wrong attempts. Ask admin to unlock.',
        locked: true,
      }, { status: 403 })
    }
    if (!order.deliveryCode) {
      return NextResponse.json({ success: false, error: 'No delivery code generated for this order yet' }, { status: 400 })
    }

    // ── Verify the code ────────────────────────────────────────────────────────
    if (order.deliveryCode !== code.trim()) {
      order.deliveryCodeAttempts = (order.deliveryCodeAttempts || 0) + 1
      const attemptsLeft = MAX_ATTEMPTS - order.deliveryCodeAttempts

      if (attemptsLeft <= 0) {
        order.deliveryCodeLocked   = true
        order.deliveryCodeLockedAt = new Date()
        await order.save()
        return NextResponse.json({
          success:     false,
          error:       'Incorrect code. Order is now LOCKED after 3 wrong attempts. Contact admin.',
          locked:      true,
          attemptsLeft: 0,
        }, { status: 403 })
      }

      await order.save()
      return NextResponse.json({
        success:      false,
        error:        `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
        attemptsLeft,
      }, { status: 400 })
    }

    // ── Code is CORRECT — mark delivered and record cash ──────────────────────
    const now = new Date()

    order.status                 = 'delivered'
    order.deliveredAt            = now
    order.invoiceNumber          = 'INV-' + Date.now().toString(36).toUpperCase()
    order.codCollected           = true
    order.codCollectedAt         = now
    order.codCollectedAmount     = order.totalAmount  // codFee already included
    order.paymentStatus          = 'paid'
    order.codRemittanceStatus    = 'pending'
    order.deliveryCodeCollectedBy = user._id
    order.statusHistory.push({
      status:    'delivered',
      timestamp: now,
      note:      `Delivery code verified by agent ${user._id}. Cash collected: Rs.${order.codCollectedAmount}`,
    })
    await order.save()

    // Sync all sub-orders to delivered
    await SubOrder.updateMany(
      { parentOrder: order._id, status: { $nin: ['cancelled', 'returned'] } },
      {
        $set:  { status: 'delivered', deliveredAt: now },
        $push: { statusHistory: { status: 'delivered', timestamp: now, note: 'Delivery code verified' } },
      }
    )

    // Credit sellers (10% commission deducted)
    const COMMISSION = 0.10
    const sellerEarnings = new Map<string, number>()
    for (const item of order.items) {
      const sid = item.seller.toString()
      const net = Math.round(item.price * item.quantity * (1 - COMMISSION) * 100) / 100
      sellerEarnings.set(sid, (sellerEarnings.get(sid) || 0) + net)
    }
    for (const [sid, net] of Array.from(sellerEarnings.entries())) {
      await SellerLedger.create({
        seller:      sid, order: order._id,
        orderNumber: order.orderNumber, itemTitle: 'COD order delivered',
        grossAmount: net / (1 - COMMISSION), commissionRate: 10,
        commissionFee: Math.round(net / (1 - COMMISSION) * COMMISSION * 100) / 100,
        collectionFee: 0, netEarning: net,
        status: 'pending',
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
      message: `✓ Delivery verified! Cash Rs.${order.codCollectedAmount?.toLocaleString()} collected.`,
      order: { orderNumber: order.orderNumber, totalAmount: order.codCollectedAmount },
    })
  } catch (err) {
    console.error('Verify delivery code error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
