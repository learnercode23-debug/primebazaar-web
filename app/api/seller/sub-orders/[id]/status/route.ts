export const dynamic = 'force-dynamic'
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
import SellerPerformance from '@/models/SellerPerformance'
import { deriveParentStatus } from '@/lib/splitOrder'

const ALLOWED_TRANSITIONS: Record<string, string> = {
  confirmed:        'processing',
  processing:       'packed',
  packed:           'shipped',
  shipped:          'delivered',
  out_for_delivery: 'delivered',
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

    // Auto-generate delivery verification code when a COD order ships
    if (status === 'shipped') {
      try {
        const parentOrder = await Order.findById(sub.parentOrder)
        if (parentOrder && parentOrder.paymentMethod === 'cod' && !parentOrder.deliveryCode) {
          const code = String(Math.floor(10000 + Math.random() * 90000))
          parentOrder.deliveryCode            = code
          parentOrder.deliveryCodeGeneratedAt = now
          parentOrder.deliveryCodeAttempts    = 0
          parentOrder.deliveryCodeLocked      = false
          await parentOrder.save()
        }
      } catch (codeErr) {
        console.error('Auto-generate delivery code error:', codeErr)
      }
    }

    // Update seller performance metrics
    try {
      const perf = await SellerPerformance.findOneAndUpdate(
        { seller: sub.seller },
        { $setOnInsert: { seller: sub.seller } },
        { upsert: true, new: true }
      )
      if (perf) {
        if (status === 'processing') {
          // Seller accepted — check if on time
          const onTime = sub.acceptDeadline ? now <= sub.acceptDeadline : true
          if (onTime) perf.acceptedOnTime += 1
          else        perf.acceptedLate   += 1
        }
        if (status === 'shipped') {
          // Seller shipped — check if on time
          const onTime = sub.shipDeadline ? now <= sub.shipDeadline : true
          if (onTime) perf.shippedOnTime += 1
          else        perf.shippedLate   += 1
        }
        if (status === 'cancelled') perf.cancelled += 1
        if (status === 'delivered') perf.delivered += 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(perf as any).recompute()
        await perf.save()
      }
    } catch (perfErr) {
      console.error('Performance update error:', perfErr)
    }

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
