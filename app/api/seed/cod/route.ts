// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/seed/cod
 * Creates 3 demo COD orders for testing:
 *   1. Normal COD — delivered, cash collected, pending remittance
 *   2. Refused COD — customer refused, payment never collected
 *   3. Pending COD — out for delivery, not yet collected
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'
import Product from '@/models/Product'
import CODSettings from '@/models/CODSettings'
import { generateTrackingNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    // Ensure COD settings exist
    const cfg = await CODSettings.findOne()
    if (!cfg) {
      await CODSettings.create({
        maxOrderValue: 50000, handlingFee: 50, handlingFeeType: 'fixed',
        isEnabled: true, otpRequired: false, maxDailyOrdersPerCustomer: 5,
      })
    }

    // Find a customer and a seller to attach to demo orders
    const customer = await User.findOne({ role: 'customer' }).lean()
    const seller   = await User.findOne({ role: 'seller' }).lean()
    const product  = await Product.findOne({ isApproved: true, stock: { $gt: 0 } }).lean()

    if (!customer || !seller || !product) {
      return NextResponse.json({
        success: false,
        error: 'Need at least one customer, one seller, and one approved product in the DB first.',
      }, { status: 400 })
    }

    const baseItem = {
      product:       product._id,
      title:         product.title,
      image:         product.images?.[0] || '',
      price:         product.discountPrice || product.price,
      originalPrice: product.price,
      quantity:      1,
      seller:        seller._id,
    }

    const baseAddress = {
      name: customer.name, street: '123 Test Lane',
      city: 'Kathmandu', state: 'Bagmati', zipCode: '44600', country: 'NP', phone: '9800000000',
    }

    // ── Order 1: Normal COD — collected, pending remittance ──
    const order1 = await Order.create({
      user: customer._id, items: [baseItem],
      shippingAddress: baseAddress,
      paymentMethod: 'cod', paymentStatus: 'paid', status: 'delivered',
      codFee: 50, codCollected: true,
      codCollectedAt: new Date(Date.now() - 2 * 3600000),
      codCollectedAmount: (product.discountPrice || product.price) + 50,
      codRemittanceStatus: 'pending',
      subtotal: product.discountPrice || product.price,
      shippingCost: 9.99, tax: 0, discount: 0, storeCreditUsed: 0,
      totalAmount: (product.discountPrice || product.price) + 9.99 + 50,
      deliveredAt: new Date(Date.now() - 2 * 3600000),
      trackingNumber: generateTrackingNumber(),
      invoiceNumber: 'INV-SEED-COD1-' + Date.now().toString(36).toUpperCase(),
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(Date.now() - 86400000), note: 'COD order placed' },
        { status: 'delivered', timestamp: new Date(Date.now() - 2 * 3600000), note: 'Cash collected: Rs.' + ((product.discountPrice || product.price) + 50) },
      ],
    })

    // ── Order 2: Refused COD ──
    const order2 = await Order.create({
      user: customer._id, items: [baseItem],
      shippingAddress: baseAddress,
      paymentMethod: 'cod', paymentStatus: 'pending', status: 'refused',
      codFee: 50, codCollected: false,
      codRemittanceStatus: 'not_applicable',
      subtotal: product.discountPrice || product.price,
      shippingCost: 9.99, tax: 0, discount: 0, storeCreditUsed: 0,
      totalAmount: (product.discountPrice || product.price) + 9.99 + 50,
      deliveryFailureReason: 'Customer refused to pay at door',
      trackingNumber: generateTrackingNumber(),
      invoiceNumber: 'INV-SEED-COD2-' + Date.now().toString(36).toUpperCase(),
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(Date.now() - 48 * 3600000), note: 'COD order placed' },
        { status: 'refused',   timestamp: new Date(Date.now() - 24 * 3600000), note: 'Customer refused delivery' },
      ],
    })

    // ── Order 3: Pending — out for delivery ──
    const order3 = await Order.create({
      user: customer._id, items: [baseItem],
      shippingAddress: baseAddress,
      paymentMethod: 'cod', paymentStatus: 'pending', status: 'out_for_delivery',
      codFee: 50, codCollected: false,
      codRemittanceStatus: 'pending',
      subtotal: product.discountPrice || product.price,
      shippingCost: 9.99, tax: 0, discount: 0, storeCreditUsed: 0,
      totalAmount: (product.discountPrice || product.price) + 9.99 + 50,
      trackingNumber: generateTrackingNumber(),
      invoiceNumber: 'INV-SEED-COD3-' + Date.now().toString(36).toUpperCase(),
      statusHistory: [
        { status: 'confirmed',       timestamp: new Date(Date.now() - 4 * 3600000), note: 'COD order placed' },
        { status: 'out_for_delivery',timestamp: new Date(Date.now() - 1 * 3600000), note: 'Out for delivery' },
      ],
    })

    return NextResponse.json({
      success: true,
      message: '3 demo COD orders created',
      orders: [
        { id: order1._id, label: 'Collected — pending remittance', orderNumber: order1.orderNumber },
        { id: order2._id, label: 'Refused — no cash collected',    orderNumber: order2.orderNumber },
        { id: order3._id, label: 'Out for delivery — pending',     orderNumber: order3.orderNumber },
      ],
    })
  } catch (err) {
    console.error('COD seed error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
