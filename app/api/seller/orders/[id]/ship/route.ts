export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'
import { notifyOrderShipped } from '@/lib/notifications'
import { sendShippingNotification } from '@/lib/email'
import { addDays, format } from 'date-fns'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const order = await Order.findById(params.id).populate('user', 'name email')
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    // Sellers can only ship orders that contain their products
    if (user.role === 'seller') {
      const sellerId = user._id.toString()
      const ownsItem = order.items.some((item: { seller?: { toString(): string } }) => item.seller?.toString() === sellerId)
      if (!ownsItem) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const { trackingNumber, carrier, estimatedDeliveryDays = 5 } = await req.json()

    order.status = 'shipped'
    order.trackingNumber = trackingNumber
    order.trackingCarrier = carrier
    order.estimatedDelivery = addDays(new Date(), estimatedDeliveryDays)
    await order.save()

    const orderUser = order.user as { _id: { toString: () => string }; email?: string }
    const customer = await User.findById(orderUser._id)

    if (customer?.email) {
      await sendShippingNotification(customer.email, {
        orderNumber: order.orderNumber,
        trackingNumber,
        carrier,
        estimatedDelivery: format(order.estimatedDelivery!, 'MMMM d, yyyy'),
      })
    }

    await notifyOrderShipped(orderUser._id.toString(), order.orderNumber, order._id.toString(), trackingNumber)

    return NextResponse.json({ success: true, data: order })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
