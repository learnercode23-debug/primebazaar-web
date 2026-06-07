// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/orders/khalti
 * Customer submits a Khalti QR order with their transaction ID.
 * Order is created with paymentStatus = "pending_verification".
 * Admin must manually verify before order is confirmed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { generateTrackingNumber } from '@/lib/utils'
import { splitOrderBySeller } from '@/lib/splitOrder'
import { assignProductSeller } from '@/lib/assignmentEngine'
import { createNotification } from '@/lib/notifications'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const { shippingAddress, transactionId, couponCode } = await req.json()

    // Validate transaction ID
    const txnId = transactionId?.trim()
    if (!txnId || txnId.length < 5) {
      return NextResponse.json({ error: 'Valid Khalti transaction ID required' }, { status: 400 })
    }

    // Prevent reuse of the same transaction ID (fraud prevention)
    const existingTxn = await Order.findOne({ khaltiTransactionId: txnId })
    if (existingTxn) {
      return NextResponse.json({ error: 'This transaction ID has already been used' }, { status: 400 })
    }

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    let subtotal = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = item.product
      if (!product || !product.isApproved || product.stock < item.quantity) {
        return NextResponse.json({ error: `"${product?.title}" is unavailable` }, { status: 400 })
      }
      const price = product.discountPrice || product.price
      subtotal += price * item.quantity

      const assignment = await assignProductSeller(
        product._id.toString(), product.seller.toString(), item.quantity
      )

      orderItems.push({
        product:         product._id,
        title:           product.title,
        image:           product.images[0] || '',
        price,
        originalPrice:   product.price,
        quantity:        item.quantity,
        seller:          assignment.sellerId,
        assignmentRule:  assignment.rule,
        assignmentReason:assignment.reason,
      })
    }

    const shippingCost = subtotal > 500 ? 0 : 99
    let discount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(), isActive: true,
        validFrom: { $lte: new Date() }, validTo: { $gte: new Date() },
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      })
      if (coupon && subtotal >= coupon.minPurchase) {
        discount = coupon.discountType === 'percentage'
          ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
          : coupon.discountValue
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } })
      }
    }

    const totalAmount = Math.max(0, Math.round((subtotal + shippingCost - discount) * 100) / 100)

    const order = await Order.create({
      user:            user._id,
      items:           orderItems,
      shippingAddress,
      paymentMethod:   'khalti_qr',
      paymentStatus:   'pending_verification',
      status:          'pending',   // hold until payment verified
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      couponCode:      couponCode || undefined,
      trackingNumber:  generateTrackingNumber(),
      invoiceNumber:   'INV-' + Date.now().toString(36).toUpperCase(),
      // Khalti QR specific fields
      khaltiTransactionId:      txnId,
      khaltiVerificationStatus: 'pending_verification',
    })

    // Decrement stock tentatively
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    }
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    // Split into sub-orders
    await splitOrderBySeller(order._id.toString(), order.orderNumber, orderItems).catch(console.error)

    // Notify admins of new pending payment
    const admins = await User.find({ role: 'admin' }).select('_id').lean()
    for (const admin of admins) {
      await createNotification(
        admin._id.toString(),
        'admin_alert',
        'Khalti QR Payment Pending',
        `Order #${order.orderNumber} — Rs.${totalAmount} — TXN: ${txnId} — needs verification`,
        '/admin/khalti'
      ).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      data: { orderId: order._id, orderNumber: order.orderNumber, totalAmount },
      message: 'Order placed! Your payment is under verification.',
    }, { status: 201 })
  } catch (err) {
    console.error('Khalti QR order error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
