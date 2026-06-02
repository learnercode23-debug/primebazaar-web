/**
 * GET /api/orders/:id/shipments
 * Returns the sub-orders for a given order (for customer's order detail page).
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'
import Order from '@/models/Order'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    // Verify the order belongs to this user (or they're admin)
    const order = await Order.findOne({
      _id: params.id,
      ...(user.role !== 'admin' ? { user: user._id } : {}),
    }).select('_id')

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const subOrders = await SubOrder.find({ parentOrder: params.id })
      .populate('seller', 'name')
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json({ success: true, data: subOrders })
  } catch (err) {
    console.error('Shipments error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
