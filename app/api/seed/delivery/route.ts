// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/seed/delivery
 * Creates demo data for testing the COD delivery verification system:
 *  - 1 COD order (status: out_for_delivery, with a 5-digit code) assigned to admin
 *  - Customer: uses existing customer account
 * After seeding, go to /delivery and test entering right/wrong codes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import Product from '@/models/Product'
import Order from '@/models/Order'
import { generateTrackingNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const customer = await User.findOne({ role: 'customer' }).lean()
    const product  = await Product.findOne({ isApproved: true }).lean()

    if (!customer || !product) {
      return NextResponse.json({
        success: false,
        error:   'Need at least one customer and one approved product in the DB.',
      }, { status: 400 })
    }

    const price        = product.discountPrice || product.price
    const deliveryCode = String(Math.floor(10000 + Math.random() * 90000))
    const codFee       = 50

    const order = await Order.create({
      user:       customer._id,
      items:      [{
        product:       product._id,
        title:         product.title,
        image:         product.images?.[0] || '',
        price,
        originalPrice: product.price,
        quantity:      1,
        seller:        product.seller,
      }],
      shippingAddress: {
        name: customer.name, street: '42 Test Street',
        city: 'Kathmandu', state: 'Bagmati',
        zipCode: '44600', country: 'NP', phone: '9800000001',
      },
      paymentMethod:           'cod',
      paymentStatus:           'pending',
      status:                  'out_for_delivery',
      subtotal:                price,
      shippingCost:            9.99,
      tax:                     0,
      discount:                0,
      storeCreditUsed:         0,
      totalAmount:             price + 9.99 + codFee,
      codFee,
      codCollected:            false,
      codRemittanceStatus:     'pending',
      deliveryCode,
      deliveryCodeGeneratedAt: new Date(),
      deliveryCodeAttempts:    0,
      deliveryCodeLocked:      false,
      // Assign to admin user so they can test the delivery screen
      deliveryCodeCollectedBy: admin._id,
      trackingNumber:          generateTrackingNumber(),
      invoiceNumber:           'INV-DEMO-DEL-' + Date.now().toString(36).toUpperCase(),
      statusHistory: [
        { status: 'confirmed',       timestamp: new Date(Date.now() - 3600000 * 3), note: 'COD order placed' },
        { status: 'out_for_delivery',timestamp: new Date(Date.now() - 3600000),     note: 'Assigned to delivery agent' },
      ],
    })

    return NextResponse.json({
      success: true,
      message: `Demo COD order created! Order #${order.orderNumber}`,
      data: {
        orderId:      order._id,
        orderNumber:  order.orderNumber,
        deliveryCode, // ← 5-digit code to test with
        customer:     { name: customer.name, email: customer.email },
        product:      product.title,
        totalAmount:  order.totalAmount,
        instructions: [
          `1. Go to /delivery (you are logged in as admin, assigned to yourself)`,
          `2. Click "Verify Delivery" on order #${order.orderNumber}`,
          `3. Enter the order ID when prompted for QR scan: ${order._id}`,
          `4. Enter this OTP: ${deliveryCode}`,
          `5. Try a wrong code first to test retry/lock behaviour`,
        ],
      },
    })
  } catch (err) {
    console.error('Delivery seed error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
