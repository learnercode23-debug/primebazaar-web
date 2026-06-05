export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const isOwner = order.user.toString() === user._id.toString()
    if (!isOwner && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return NextResponse.json({ success: false, error: 'Order cannot be cancelled at this stage' }, { status: 400 })
    }

    order.status = 'cancelled'
    await order.save()

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    }

    await createNotification(
      user._id.toString(),
      'order_cancelled',
      'Order Cancelled',
      `Order ${order.orderNumber} has been cancelled.`,
      `/orders/${order._id}`
    )

    return NextResponse.json({ success: true, data: order })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
