export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/:orderId/refuse
 * Customer refused delivery — sets status to 'refused', payment stays unpaid.
 * Body: { reason?, returnShippingCost? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || !['admin', 'seller', 'delivery'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { reason, returnShippingCost } = await req.json().catch(() => ({}))

    const order = await Order.findOne({ _id: params.id, paymentMethod: 'cod' })
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    // A seller may only refuse an order that contains one of their own items.
    if (user.role === 'seller' && !order.items.some((i: { seller: { toString(): string } }) => i.seller.toString() === user._id.toString())) {
      return NextResponse.json({ success: false, error: 'Not your order' }, { status: 403 })
    }
    if (['delivered', 'cancelled', 'returned', 'refused'].includes(order.status)) {
      return NextResponse.json({ success: false, error: `Cannot refuse a ${order.status} order` }, { status: 400 })
    }

    order.status             = 'refused'
    order.paymentStatus      = 'pending'   // cash never collected
    order.codRemittanceStatus = 'not_applicable'
    order.deliveryFailureReason = reason || 'Customer refused delivery'
    order.statusHistory.push({
      status:    'refused',
      timestamp: new Date(),
      note:      `Refused: ${reason || 'No reason given'}${returnShippingCost ? ` | Return shipping: Rs.${returnShippingCost}` : ''}`,
    })
    await order.save()

    return NextResponse.json({ success: true, message: 'Order marked as refused' })
  } catch (err) {
    console.error('COD refuse error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
