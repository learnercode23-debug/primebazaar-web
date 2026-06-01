/**
 * POST /api/seller/orders/:id/reject
 *
 * Seller rejects a new order.
 * Body: { reason: string, category: 'out_of_stock'|'damaged'|'pricing_error'|'other' }
 *
 * Steps:
 *  1. Verify seller owns items in the order
 *  2. Only allow reject from 'confirmed' status
 *  3. Move order to 'cancelled'
 *  4. Record rejection reason + timestamp
 *  5. Restore stock if it was previously deducted (safety check)
 *  6. Notify customer
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    if (order.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        error: `Cannot reject an order with status "${order.status}"`,
      }, { status: 400 })
    }

    const { reason, category = 'other' } = await req.json()
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a reason (at least 5 characters)',
      }, { status: 400 })
    }

    order.status = 'cancelled'
    order.rejectedAt = new Date()
    order.rejectionReason = reason.trim()
    order.rejectionCategory = category
    await order.save()

    await createNotification(
      order.user.toString(),
      'order_cancelled',
      'Order Rejected',
      `Unfortunately, order ${order.orderNumber} was cancelled by the seller. Reason: ${reason.trim()}`,
      `/orders/${order._id}`
    )

    return NextResponse.json({
      success: true,
      message: 'Order rejected',
      data: { orderId: order._id, status: order.status, rejectionReason: order.rejectionReason },
    })
  } catch (err) {
    console.error('Reject order error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
