export const dynamic = 'force-dynamic'
/**
 * GET /api/delivery/orders
 * Returns all COD orders assigned to the current delivery agent.
 * Works for both DeliveryAgent model users and directly-assigned users.
 *
 * PUT /api/delivery/orders
 * Agent route actions: start_route (status -> out_for_delivery),
 * failed / refused (status -> delivery_failed).
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import DeliveryAgent from '@/models/DeliveryAgent'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'delivery' && user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Delivery agents only' }, { status: 403 })
  }
  await connectDB()

  // Support both old DeliveryAgent model and direct User assignment
  let agentName = user.name || 'Agent'
  const queryOr = [
    { deliveryCodeCollectedBy: user._id },  // new direct assignment
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentDoc = await DeliveryAgent.findOne({ user: user._id }).lean() as any
  if (agentDoc) {
    agentName = agentDoc.name
    queryOr.push({ deliveryAgent: agentDoc._id } as never)
  }

  const orders = await Order.find({
    $or:           queryOr,
    paymentMethod: 'cod',
    status:        { $in: ['shipped', 'out_for_delivery', 'delivery_failed'] },
  })
    .populate('user', 'name phone email')
    .sort({ createdAt: -1 })
    .lean()

  const totalToCollect = orders
    .filter((o) => !o.codCollected)
    .reduce((sum, o) => sum + o.totalAmount, 0)

  return NextResponse.json({
    success: true,
    data:    orders,
    totalToCollect,
    agentName,
    agentId: user._id,
  })
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'delivery' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Delivery agents only' }, { status: 403 })
    }
    await connectDB()

    const { orderId, action, failureReason } = await req.json()
    if (!orderId || !action) {
      return NextResponse.json({ success: false, error: 'orderId and action required' }, { status: 400 })
    }

    // Same assignment check as GET: only the assigned agent (or admin) can act on the order
    const queryOr: Array<Record<string, unknown>> = [{ deliveryCodeCollectedBy: user._id }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentDoc = await DeliveryAgent.findOne({ user: user._id }).lean() as any
    if (agentDoc) queryOr.push({ deliveryAgent: agentDoc._id })

    const order = await Order.findOne(
      user.role === 'admin' ? { _id: orderId } : { _id: orderId, $or: queryOr }
    )
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found or not assigned to you' }, { status: 404 })
    }

    if (action === 'start_route') {
      if (!['shipped', 'out_for_delivery'].includes(order.status)) {
        return NextResponse.json({ success: false, error: `Order is ${order.status} — not ready for delivery` }, { status: 400 })
      }
      if (order.status !== 'out_for_delivery') {
        order.status = 'out_for_delivery'
        order.statusHistory.push({ status: 'out_for_delivery', timestamp: new Date(), note: 'Courier started the delivery route' })
        await order.save()
        await createNotification(
          order.user.toString(),
          'order_shipped',
          'Out for Delivery 🛵',
          `Your order #${order.orderNumber} is out for delivery — track it live!`,
          `/track/${order._id}`
        ).catch(console.error)
      }
      return NextResponse.json({ success: true, data: { status: order.status } })
    }

    if (action === 'failed' || action === 'refused') {
      if (order.status === 'delivered') {
        return NextResponse.json({ success: false, error: 'Order is already delivered' }, { status: 400 })
      }
      order.status = 'delivery_failed'
      order.statusHistory.push({
        status: 'delivery_failed',
        timestamp: new Date(),
        note: failureReason ? `${action}: ${failureReason}` : action,
      })
      await order.save()
      return NextResponse.json({ success: true, data: { status: order.status } })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('delivery order action error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
