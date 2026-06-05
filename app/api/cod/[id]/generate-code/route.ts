export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/:orderId/generate-code
 * Generates (or regenerates) the 5-digit delivery verification code for a COD order.
 * Called automatically when the order ships, or by customer to regenerate a lost code.
 *
 * Returns the plain 5-digit code — the caller (customer order page) displays it.
 * The code is also stored on the Order document so the delivery agent can verify it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

function generateFiveDigitCode(): string {
  // Returns a random 5-digit string: "10000" – "99999"
  return String(Math.floor(10000 + Math.random() * 90000))
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    // Only the order owner or admin can generate/regenerate
    if (order.user.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (order.paymentMethod !== 'cod') {
      return NextResponse.json({ success: false, error: 'Not a COD order' }, { status: 400 })
    }

    if (['delivered', 'cancelled', 'refused', 'returned'].includes(order.status)) {
      return NextResponse.json({ success: false, error: 'Order already completed' }, { status: 400 })
    }

    const code = generateFiveDigitCode()

    order.deliveryCode            = code
    order.deliveryCodeGeneratedAt = new Date()
    order.deliveryCodeAttempts    = 0         // reset on regenerate
    order.deliveryCodeLocked      = false     // unlock on regenerate
    await order.save()

    return NextResponse.json({ success: true, code })
  } catch (err) {
    console.error('Generate delivery code error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
