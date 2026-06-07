// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * PATCH /api/admin/orders/:id/verify-khalti
 * Admin approves a Khalti QR payment — order moves to confirmed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
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

    const order = await Order.findOne({ _id: params.id, paymentMethod: 'khalti_qr' })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.khaltiVerificationStatus !== 'pending_verification') {
      return NextResponse.json({ error: `Order already ${order.khaltiVerificationStatus}` }, { status: 400 })
    }

    order.paymentStatus            = 'paid'
    order.status                   = 'confirmed'
    order.khaltiVerificationStatus = 'verified'
    order.khaltiVerifiedBy         = admin._id
    order.khaltiVerifiedAt         = new Date()
    order.statusHistory.push({
      status:    'confirmed',
      timestamp: new Date(),
      note:      `Khalti QR payment verified by admin. TXN: ${order.khaltiTransactionId}`,
    })
    await order.save()

    // Notify customer
    await createNotification(
      order.user.toString(),
      'admin_alert',
      '✅ Payment Verified!',
      `Your Khalti payment for order #${order.orderNumber} (Rs.${order.totalAmount}) is verified. Order is now confirmed!`,
      `/orders/${order._id}`
    ).catch(console.error)

    return NextResponse.json({ success: true, message: 'Payment verified — order confirmed' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
