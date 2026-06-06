export const dynamic = 'force-dynamic'
/**
 * PUT /api/seller/orders/:id/status
 *
 * Seller advances the order through the status pipeline:
 *   processing → packed → shipped (requires trackingNumber) → delivered
 *
 * Body for 'shipped': { status: 'shipped', trackingNumber: string, carrier?: string }
 * Body for others:    { status: 'packed'|'delivered' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'
import { createNotification } from '@/lib/notifications'
import { createLedgerEntry } from '@/lib/settlement'
import { sendShippingNotification } from '@/lib/email'
import { addDays, format } from 'date-fns'

// Valid seller-driven transitions
const ALLOWED_TRANSITIONS: Record<string, string> = {
  processing:       'packed',
  packed:           'shipped',
  shipped:          'delivered',
  out_for_delivery: 'delivered',
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const order = await Order.findById(params.id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const myItems = (order.items as Array<{ seller: { toString: () => string } }>).filter(
      (item) => item.seller.toString() === user._id.toString()
    )
    if (myItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No items in this order belong to you' }, { status: 403 })
    }

    const body = await req.json()
    const { status, trackingNumber, carrier } = body

    // Check it's a valid transition from current status
    const expectedNext = ALLOWED_TRANSITIONS[order.status]
    if (!expectedNext || status !== expectedNext) {
      return NextResponse.json({
        success: false,
        error: `Cannot transition from "${order.status}" to "${status}". Expected next: "${expectedNext}"`,
      }, { status: 400 })
    }

    // Shipping requires a tracking number
    if (status === 'shipped' && !trackingNumber?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Tracking number is required when marking as shipped',
      }, { status: 400 })
    }

    // Apply the transition
    const now = new Date()
    order.status = status

    if (status === 'packed') {
      order.packedAt = now
    }

    if (status === 'shipped') {
      order.shippedAt = now
      order.trackingNumber = trackingNumber.trim()
      order.trackingCarrier = carrier?.trim() || undefined
      order.estimatedDelivery = addDays(now, 5)

      // Email + notification to customer
      const customer = await User.findById(order.user)
      if (customer?.email) {
        await sendShippingNotification(customer.email, {
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber,
          carrier: order.trackingCarrier,
          estimatedDelivery: format(order.estimatedDelivery, 'MMMM d, yyyy'),
        })
      }
      await createNotification(
        order.user.toString(),
        'order_shipped',
        'Your order has shipped! 🚚',
        `${order.orderNumber} is on its way. Tracking: ${order.trackingNumber}`,
        `/orders/${order._id}`
      )
    }

    if (status === 'delivered') {
      order.deliveredAt = now
      order.actualDelivery = now
      // Create seller ledger entries for earnings (non-blocking)
      createLedgerEntry(order._id.toString()).catch(console.error)
      await createNotification(
        order.user.toString(),
        'order_delivered',
        'Order Delivered ✅',
        `Your order ${order.orderNumber} has been delivered. Enjoy your purchase!`,
        `/orders/${order._id}`
      )
    }

    await order.save()

    return NextResponse.json({
      success: true,
      message: `Order marked as ${status}`,
      data: {
        orderId: order._id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
      },
    })
  } catch (err) {
    console.error('Update order status error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
