// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * PATCH /api/admin/orders/:id/reject-khalti
 * Admin rejects a Khalti QR payment — order cancelled, stock restored.
 * Body: { reason: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import { createNotification } from '@/lib/notifications'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { reason } = await req.json()
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

    const order = await Order.findOne({ _id: params.id, paymentMethod: 'khalti_qr' })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.khaltiVerificationStatus !== 'pending_verification') {
      return NextResponse.json({ error: `Order already ${order.khaltiVerificationStatus}` }, { status: 400 })
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }).catch(console.error)
    }

    order.paymentStatus            = 'failed'
    order.status                   = 'cancelled'
    order.khaltiVerificationStatus = 'rejected'
    order.khaltiRejectionReason    = reason.trim()
    order.khaltiVerifiedBy         = admin._id
    order.khaltiVerifiedAt         = new Date()
    order.statusHistory.push({
      status:    'cancelled',
      timestamp: new Date(),
      note:      `Khalti payment rejected by admin. Reason: ${reason.trim()}`,
    })
    await order.save()

    // Notify customer
    await createNotification(
      order.user.toString(),
      'admin_alert',
      '❌ Payment Rejected',
      `Your Khalti payment for order #${order.orderNumber} was rejected. Reason: ${reason.trim()}. Please contact support.`,
      `/orders/${order._id}`
    ).catch(console.error)

    return NextResponse.json({ success: true, message: 'Payment rejected — order cancelled' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
