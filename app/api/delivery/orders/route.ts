export const dynamic = 'force-dynamic'
/**
 * GET /api/delivery/orders
 * Returns all COD orders assigned to the current delivery agent.
 * Works for both DeliveryAgent model users and directly-assigned users.
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
