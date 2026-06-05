// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/orders/:id/scan
 * Delivery agent scans the order QR code to confirm they have the right order.
 * Body: { scannedOrderId: string }
 *
 * The QR code encodes the order ID. Validation: scanned ID must match the URL param.
 * Returns order details if valid so the agent can proceed to OTP entry.
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
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const { scannedOrderId } = await req.json()
    if (!scannedOrderId) {
      return NextResponse.json({ success: false, error: 'Scanned order ID required' }, { status: 400 })
    }

    // Validate: scanned QR must match this order
    if (scannedOrderId.trim() !== params.id) {
      return NextResponse.json({
        success: false,
        error:   'Wrong order! The scanned QR does not match this order.',
        code:    'QR_MISMATCH',
      }, { status: 400 })
    }

    const order = await Order.findById(params.id)
      .populate('user', 'name phone email')
      .lean()

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (order.paymentMethod !== 'cod') {
      return NextResponse.json({ success: false, error: 'Not a COD order' }, { status: 400 })
    }
    if (!['shipped', 'out_for_delivery'].includes(order.status)) {
      return NextResponse.json({
        success: false,
        error:   `Order is "${order.status}" — can only scan when shipped or out for delivery`,
      }, { status: 400 })
    }
    if (order.codCollected) {
      return NextResponse.json({ success: false, error: 'Already delivered and cash collected' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '✓ QR verified — order matches. Proceed to OTP entry.',
      order: {
        _id:         order._id,
        orderNumber: order.orderNumber,
        status:      order.status,
        totalAmount: order.totalAmount,
        codFee:      order.codFee || 0,
        items:       order.items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
        customer:    (order.user as { name?: string; phone?: string } | null),
        shippingAddress: order.shippingAddress,
        deliveryCodeLocked:   order.deliveryCodeLocked,
        deliveryCodeAttempts: order.deliveryCodeAttempts,
      },
    })
  } catch (err) {
    console.error('Order scan error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
