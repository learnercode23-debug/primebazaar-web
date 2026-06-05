export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/khalti/pending
 * Admin: list all orders pending Khalti QR verification.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending_verification'

    const filter: Record<string, unknown> = { paymentMethod: 'khalti_qr' }
    if (status !== 'all') filter.khaltiVerificationStatus = status

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .populate('khaltiVerifiedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    const [pending, verified, rejected] = await Promise.all([
      Order.countDocuments({ paymentMethod: 'khalti_qr', khaltiVerificationStatus: 'pending_verification' }),
      Order.countDocuments({ paymentMethod: 'khalti_qr', khaltiVerificationStatus: 'verified' }),
      Order.countDocuments({ paymentMethod: 'khalti_qr', khaltiVerificationStatus: 'rejected' }),
    ])

    return NextResponse.json({ success: true, data: orders, counts: { pending, verified, rejected } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
