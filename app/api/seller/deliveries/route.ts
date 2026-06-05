// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/seller/deliveries?status=pending|confirmed|disputed
 * Seller's delivery proof confirmation queue.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import DeliveryProof from '@/models/DeliveryProof'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Seller/Admin only' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    // Find orders where this seller has items
    const sellerOrders = await Order.find({
      'items.seller': user.role === 'admin' ? { $exists: true } : user._id,
      status: 'delivered',
    }).select('_id').lean()

    const orderIds = sellerOrders.map(o => o._id)

    const proofFilter: Record<string, unknown> = { order: { $in: orderIds } }
    if (status !== 'all') proofFilter.confirmationStatus = status

    const proofs = await DeliveryProof.find(proofFilter)
      .populate('order',  'orderNumber totalAmount shippingAddress user deliveredAt')
      .populate('agent',  'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    // Summary counts
    const [pending, confirmed, disputed] = await Promise.all([
      DeliveryProof.countDocuments({ order: { $in: orderIds }, confirmationStatus: 'pending' }),
      DeliveryProof.countDocuments({ order: { $in: orderIds }, confirmationStatus: 'confirmed' }),
      DeliveryProof.countDocuments({ order: { $in: orderIds }, confirmationStatus: 'disputed' }),
    ])

    return NextResponse.json({
      success: true,
      data: proofs,
      counts: { pending, confirmed, disputed },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
