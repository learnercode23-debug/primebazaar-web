export const dynamic = 'force-dynamic'
/**
 * POST /api/admin/sub-orders/:id/cancel
 * Admin manually cancels a sub-order. Logs the action.
 * Body: { reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'
import Order from '@/models/Order'
import AssignmentLog from '@/models/AssignmentLog'
import { deriveParentStatus } from '@/lib/splitOrder'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { reason } = await req.json().catch(() => ({ reason: '' }))

    const sub = await SubOrder.findById(params.id)
    if (!sub) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (['delivered','cancelled','returned'].includes(sub.status)) {
      return NextResponse.json({ success: false, error: `Cannot cancel a ${sub.status} order` }, { status: 400 })
    }

    const cancelReason = reason?.trim() || 'Manually cancelled by admin'

    sub.status         = 'cancelled'
    sub.rejectedAt     = new Date()
    sub.rejectionReason = cancelReason
    sub.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: `Admin cancel: ${cancelReason}` })
    await sub.save()

    // Sync parent order status
    const siblings = await SubOrder.find({ parentOrder: sub.parentOrder }).select('status').lean()
    await Order.findByIdAndUpdate(sub.parentOrder, { status: deriveParentStatus(siblings.map((s) => s.status)) })

    // Log
    await AssignmentLog.create({
      subOrder:    sub._id,
      order:       sub.parentOrder,
      action:      'manual_reassigned',
      fromSeller:  sub.seller,
      toSeller:    sub.seller,
      rule:        'admin_cancel',
      reason:      cancelReason,
      performedBy: admin._id,
      timestamp:   new Date(),
    })

    return NextResponse.json({ success: true, message: 'Sub-order cancelled' })
  } catch (err) {
    console.error('Admin cancel error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
