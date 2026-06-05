export const dynamic = 'force-dynamic'
/**
 * POST /api/orders/:id/assign
 * Admin assigns a COD order to a delivery agent.
 * Body: { agentUserId: string }
 *
 * Flow: placed → assigned → out_for_delivery
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { agentUserId } = await req.json()
    if (!agentUserId) {
      return NextResponse.json({ success: false, error: 'agentUserId required' }, { status: 400 })
    }

    // Validate agent exists
    const agent = await User.findOne({ _id: agentUserId, isActive: true }).select('name email')
    if (!agent) {
      return NextResponse.json({ success: false, error: 'Delivery agent not found' }, { status: 404 })
    }

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (['delivered', 'cancelled', 'refused', 'returned'].includes(order.status)) {
      return NextResponse.json({ success: false, error: `Cannot assign a ${order.status} order` }, { status: 400 })
    }

    // Assign agent and set status to out_for_delivery
    order.deliveryCodeCollectedBy = agentUserId
    order.status = 'out_for_delivery'
    order.statusHistory.push({
      status:    'out_for_delivery',
      timestamp: new Date(),
      note:      `Assigned to agent: ${agent.name}`,
    })

    // Auto-generate delivery code if not already set
    if (!order.deliveryCode) {
      order.deliveryCode            = String(Math.floor(10000 + Math.random() * 90000))
      order.deliveryCodeGeneratedAt = new Date()
      order.deliveryCodeAttempts    = 0
      order.deliveryCodeLocked      = false
    }

    await order.save()

    return NextResponse.json({
      success: true,
      message: `Order assigned to ${agent.name}`,
      agent: { _id: agent._id, name: agent.name, email: agent.email },
    })
  } catch (err) {
    console.error('Assign order error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
