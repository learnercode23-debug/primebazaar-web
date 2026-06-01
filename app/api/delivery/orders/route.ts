/**
 * GET /api/delivery/orders — delivery agent's assigned COD orders
 * PUT /api/delivery/orders — update delivery status (delivered / failed / refused)
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import DeliveryAgent from '@/models/DeliveryAgent'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const agent = await DeliveryAgent.findOne({ user: user._id })
  if (!agent) return NextResponse.json({ success: false, error: 'Not a delivery agent' }, { status: 403 })

  const orders = await Order.find({
    deliveryAgent: agent._id,
    paymentMethod: 'cod',
    status: { $in: ['out_for_delivery', 'delivery_failed'] },
  })
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .lean()

  const totalToCollect = orders
    .filter((o) => !o.codCollected)
    .reduce((sum, o) => sum + o.totalAmount, 0)

  return NextResponse.json({ success: true, data: orders, totalToCollect, agentName: agent.name })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const agent = await DeliveryAgent.findOne({ user: user._id })
  if (!agent) return NextResponse.json({ success: false, error: 'Not a delivery agent' }, { status: 403 })

  const { orderId, action, failureReason, nextAttemptDate, collectedAmount } = await req.json()

  const order = await Order.findOne({ _id: orderId, deliveryAgent: agent._id })
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

  const now = new Date()

  if (action === 'delivered') {
    order.status = 'delivered'
    order.deliveredAt = now
    order.codCollected = true
    order.codCollectedAt = now
    order.codCollectedAmount = collectedAmount || order.totalAmount
    order.paymentStatus = 'paid'
    order.codRemittanceStatus = 'pending'
    order.statusHistory.push({ status: 'delivered', timestamp: now, note: 'Delivered & cash collected' })

    // Update agent stats
    await DeliveryAgent.findByIdAndUpdate(agent._id, {
      $inc: {
        totalDeliveries: 1,
        totalCashCollected: order.totalAmount,
        pendingRemittance: order.totalAmount,
      },
    })

  } else if (action === 'failed') {
    order.status = 'delivery_failed'
    order.deliveryAttempts += 1
    order.deliveryFailureReason = failureReason || 'Customer not available'
    if (nextAttemptDate) order.nextAttemptDate = new Date(nextAttemptDate)
    order.statusHistory.push({ status: 'delivery_failed', timestamp: now, note: failureReason })

  } else if (action === 'refused') {
    order.status = 'refused'
    order.deliveryFailureReason = failureReason || 'Customer refused delivery'
    order.statusHistory.push({ status: 'refused', timestamp: now, note: failureReason })
  }

  await order.save()
  return NextResponse.json({ success: true, message: `Order marked as ${action}` })
}
