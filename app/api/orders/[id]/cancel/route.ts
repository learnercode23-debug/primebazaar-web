export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import SubOrder from '@/models/SubOrder'
import { createNotification } from '@/lib/notifications'
import { sendOrderCancelledEmail } from '@/lib/email'
import User from '@/models/User'

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

    // Send cancellation email to customer (awaited so Vercel doesn't kill it early)
    console.log('[CANCEL] Looking up customer for order.user:', order.user?.toString())
    const customer = await User.findById(order.user).select('email name').lean() as { email: string; name: string } | null
    console.log('[CANCEL] Customer found:', customer ? customer.email : 'NOT FOUND')
    if (customer) {
      const cancelledBy = user.role === 'admin' ? 'admin' : 'customer'
      const itemList = order.items.map((i: { title: string; quantity: number }) => ({
        title: i.title,
        quantity: i.quantity,
      }))
      console.log('[CANCEL] Sending cancel email to:', customer.email, 'order:', order.orderNumber)
      await sendOrderCancelledEmail(customer.email, {
        name: customer.name,
        orderNumber: order.orderNumber,
        total: order.totalAmount,
        cancelledBy,
        items: itemList,
      }).catch((err) => console.error('[EMAIL] Order cancel email failed:', err))
      console.log('[CANCEL] Email send completed')
    }

    // Notify the customer
    await createNotification(
      order.user.toString(),
      'order_cancelled',
      'Order Cancelled',
      `Order ${order.orderNumber} has been cancelled.`,
      `/orders/${order._id}`
    ).catch(() => {})

    // Notify each unique seller who had sub-orders in this order
    const subOrders = await SubOrder.find({ parentOrder: order._id }).select('seller').lean()
    const sellerIds = Array.from(new Set(subOrders.map((s) => s.seller.toString())))
    for (const sellerId of sellerIds) {
      await createNotification(
        sellerId,
        'order_cancelled',
        'Order Cancelled by Customer',
        `Order ${order.orderNumber} was cancelled by the customer.`,
        `/seller/orders`
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, data: order })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
