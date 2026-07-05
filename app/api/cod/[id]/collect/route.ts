export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/:orderId/collect
 * Marks cash as collected for a COD order (called by delivery agent or admin).
 * Body: { amountCollected, agentNote? }
 * Sets order.codCollected = true, codCollectedAmount, codCollectedAt
 * Also triggers seller payout calculation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import SellerLedger from '@/models/SellerLedger'
import SellerWallet from '@/models/SellerWallet'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || !['admin', 'seller', 'delivery'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { amountCollected, agentNote } = await req.json()
    if (!amountCollected || amountCollected <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount required' }, { status: 400 })
    }

    const order = await Order.findOne({ _id: params.id, paymentMethod: 'cod' })
    if (!order) return NextResponse.json({ success: false, error: 'COD order not found' }, { status: 404 })
    // Only the assigned delivery agent, a seller who owns an item, or an admin may collect.
    if (user.role === 'delivery' && order.deliveryCodeCollectedBy?.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'This order is not assigned to you' }, { status: 403 })
    }
    if (user.role === 'seller' && !order.items.some((i: { seller: { toString(): string } }) => i.seller.toString() === user._id.toString())) {
      return NextResponse.json({ success: false, error: 'Not your order' }, { status: 403 })
    }
    if (order.codCollected) {
      return NextResponse.json({ success: false, error: 'Cash already marked as collected' }, { status: 400 })
    }
    if (order.status !== 'delivered' && order.status !== 'out_for_delivery') {
      return NextResponse.json({ success: false, error: 'Order must be out for delivery or delivered to collect cash' }, { status: 400 })
    }

    // Detect mismatch
    const expectedAmount = order.totalAmount  // codFee already included in totalAmount
    const mismatch = Math.abs(amountCollected - expectedAmount) > 1  // allow Rs.1 rounding

    order.codCollected       = true
    order.codCollectedAt     = new Date()
    order.codCollectedAmount = amountCollected
    order.status             = 'delivered'
    order.deliveredAt        = new Date()
    order.paymentStatus      = 'paid'
    order.codRemittanceStatus = 'pending'
    order.statusHistory.push({
      status:    'delivered',
      timestamp: new Date(),
      note:      `Cash collected: Rs.${amountCollected}${mismatch ? ' ⚠️ AMOUNT MISMATCH' : ''}${agentNote ? ` — ${agentNote}` : ''}`,
    })
    await order.save()

    // Credit seller wallet for each seller in this order (commission: 10%)
    const COMMISSION_RATE = 0.10
    const sellerMap = new Map<string, number>()
    for (const item of order.items) {
      const sellerId = item.seller.toString()
      const earnings = item.price * item.quantity * (1 - COMMISSION_RATE)
      sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + earnings)
    }

    for (const [sellerId, amount] of Array.from(sellerMap.entries())) {
      const net = Math.round(amount * 100) / 100
      await SellerLedger.create({
        seller: sellerId, order: order._id,
        type: 'credit', amount: net,
        description: `COD payment collected for order ${order.orderNumber}`,
        status: 'pending',
      }).catch(console.error)
      await SellerWallet.findOneAndUpdate(
        { seller: sellerId },
        { $inc: { pendingBalance: net }, $setOnInsert: { seller: sellerId } },
        { upsert: true }
      ).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: mismatch
        ? `Cash collected with mismatch! Expected Rs.${expectedAmount}, got Rs.${amountCollected}`
        : 'Cash collected successfully',
      mismatch,
      expectedAmount,
    })
  } catch (err) {
    console.error('COD collect error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
