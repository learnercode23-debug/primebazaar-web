/**
 * POST /api/seller/orders/:id/accept
 *
 * Seller accepts a new order.
 * Steps:
 *  1. Verify seller owns at least one item in the order
 *  2. Check product stock is sufficient for seller's items
 *  3. Deduct stock
 *  4. Move order status: confirmed → processing
 *  5. Record acceptedAt timestamp
 *  6. Notify customer
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
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

    // Verify this seller has items in the order
    type SI = { seller: { toString: () => string }; product: { toString: () => string }; title: string; quantity: number }
    const myItems = (order.items as SI[]).filter(
      (item) => item.seller.toString() === user._id.toString()
    )
    if (myItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No items in this order belong to you' }, { status: 403 })
    }

    // Only accept from 'confirmed' state
    if (order.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        error: `Cannot accept an order with status "${order.status}"`,
      }, { status: 400 })
    }

    // ── Stock check ──────────────────────────────────────────────────────────
    const stockIssues: string[] = []
    for (const item of myItems) {
      const product = await Product.findById(item.product)
      if (!product) {
        stockIssues.push(`Product "${item.title}" no longer exists`)
        continue
      }
      if (product.stock < item.quantity) {
        stockIssues.push(
          `"${item.title}": only ${product.stock} in stock, order needs ${item.quantity}`
        )
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient stock',
        stockIssues,
      }, { status: 400 })
    }

    // ── Deduct stock ──────────────────────────────────────────────────────────
    for (const item of myItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, salesCount: item.quantity },
      })
    }

    // ── Update order ──────────────────────────────────────────────────────────
    order.status = 'processing'
    order.acceptedAt = new Date()
    await order.save()

    // ── Notify customer ──────────────────────────────────────────────────────
    await createNotification(
      order.user.toString(),
      'order_confirmed',
      'Order Accepted!',
      `Your order ${order.orderNumber} has been accepted by the seller and is being prepared.`,
      `/orders/${order._id}`
    )

    return NextResponse.json({
      success: true,
      message: 'Order accepted',
      data: { orderId: order._id, status: order.status, acceptedAt: order.acceptedAt },
    })
  } catch (err) {
    console.error('Accept order error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
