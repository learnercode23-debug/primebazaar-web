/**
 * PUT /api/seller/sub-orders/:id/status
 * Advances a sub-order through its status pipeline.
 * confirmed → processing → packed → shipped → delivered
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'
import Order from '@/models/Order'
import { deriveParentStatus } from '@/lib/splitOrder'

const ALLOWED_TRANSITIONS: Record<string, string> = {
  confirmed:  'processing',
  processing: 'packed',
  packed:     'shipped',
  shipped:    'delivered',
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { status, trackingNumber, carrier, rejectionReason } = await req.json()
    const now = new Date()

    const sub = await SubOrder.findOne({ _id: params.id, seller: user._id })
    if (!sub) return NextResponse.json({ success: false, error: 'Sub-order not found' }, { status: 404 })

    // Validate transition
    if (status === 'cancelled') {
      sub.status = 'cancelled'
      sub.rejectedAt = now
      sub.rejectionReason = rejectionReason || 'Cancelled by seller'
      sub.statusHistory.push({ status: 'cancelled', timestamp: now, note: rejectionReason })
    } else if (ALLOWED_TRANSITIONS[sub.status] === status) {
      sub.status = status as ISubOrder['status']
      if (status === 'processing') sub.acceptedAt = now
      if (status === 'packed')     sub.packedAt   = now
      if (status === 'shipped') {
        sub.shippedAt = now
        if (trackingNumber) sub.trackingNumber = trackingNumber
        if (carrier)        sub.trackingCarrier = carrier
      }
      if (status === 'delivered') sub.deliveredAt = now
      sub.statusHistory.push({ status, timestamp: now })
    } else {
      return NextResponse.json({ success: false, error: `Cannot transition from ${sub.status} to ${status}` }, { status: 400 })
    }

    await sub.save()

    // Update parent order status based on all sibling sub-orders
    const siblings = await SubOrder.find({ parentOrder: sub.parentOrder }).select('status').lean()
    const derivedStatus = deriveParentStatus(siblings.map((s) => s.status))
    await Order.findByIdAndUpdate(sub.parentOrder, { status: derivedStatus })

    return NextResponse.json({ success: true, data: sub })
  } catch (err) {
    console.error('Sub-order status error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// Needed for TypeScript — re-use the interface
interface ISubOrder { status: 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned' }
