export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { verifyEsewaPayment } from '@/lib/esewa'
import { generateTrackingNumber } from '@/lib/utils'
import { sendOrderConfirmation } from '@/lib/email'
import { notifyOrderPlaced, notifySellerNewOrder } from '@/lib/notifications'
import { splitOrderBySeller } from '@/lib/splitOrder'
import { assignProductSeller } from '@/lib/assignmentEngine'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const encodedData = searchParams.get('data')

  if (!encodedData) {
    return NextResponse.redirect(new URL('/payment/failure?reason=missing_data', req.url))
  }

  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Verify with eSewa
    const verification = await verifyEsewaPayment(encodedData)
    if (!verification.success || !verification.transactionUuid) {
      return NextResponse.redirect(new URL('/payment/failure?reason=verification_failed', req.url))
    }

    await connectDB()

    // Idempotency — this transaction may back at most one order (block replay).
    const already = await Order.findOne({ stripePaymentIntentId: verification.transactionUuid }).select('_id').lean()
    if (already) {
      return NextResponse.redirect(new URL(`/payment/success?orderId=${(already as { _id: string })._id}&method=esewa`, req.url))
    }

    // Amount actually confirmed by eSewa (from the signed response)
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8')) as { total_amount?: string }
    const paidAmount = parseFloat(String(decoded.total_amount || '0').replace(/,/g, ''))

    // Retrieve pending order data from cookie
    const pendingCookie = req.cookies.get('esewa-pending')?.value
    if (!pendingCookie) {
      return NextResponse.redirect(new URL('/payment/failure?reason=session_expired', req.url))
    }

    const pending = JSON.parse(Buffer.from(pendingCookie, 'base64').toString('utf-8')) as {
      shippingAddress: Record<string, string>
      couponCode?: string
      subtotal: number
      shippingCost: number
      discount: number
      totalAmount: number
      transactionUuid: string
    }

    await connectDB()

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.redirect(new URL('/payment/failure?reason=cart_empty', req.url))
    }

    const orderItems = []
    let serverSubtotal = 0
    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      const price = product.discountPrice || product.price
      serverSubtotal += price * item.quantity
      const assignment = await assignProductSeller(
        product._id.toString(),
        product.seller.toString(),
        item.quantity
      )
      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0] || '',
        price,
        originalPrice: product.price,
        quantity: item.quantity,
        seller: assignment.sellerId,
        assignmentRule:   assignment.rule,
        assignmentReason: assignment.reason,
      })
    }

    // Recompute the total server-side from the real cart — never trust the cookie amounts.
    const shippingCost = serverSubtotal > 999 ? 0 : 99
    let discount = 0
    if (pending.couponCode) {
      const coupon = await Coupon.findOne({
        code: pending.couponCode.toUpperCase(), isActive: true,
        validFrom: { $lte: new Date() }, validTo: { $gte: new Date() },
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      })
      if (coupon && serverSubtotal >= coupon.minPurchase) {
        discount = coupon.discountType === 'percentage'
          ? Math.min((serverSubtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
          : coupon.discountValue
      }
    }
    const serverTotal = Math.max(0, Math.round((serverSubtotal + shippingCost - discount) * 100) / 100)

    // The amount eSewa actually confirmed must match what this cart costs.
    if (Math.abs(paidAmount - serverTotal) > 1) {
      return NextResponse.redirect(new URL('/payment/failure?reason=amount_mismatch', req.url))
    }

    // Create the order with server-computed amounts
    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: pending.shippingAddress,
      paymentMethod: 'esewa',
      paymentStatus: 'paid',
      status: 'confirmed',
      subtotal: serverSubtotal,
      shippingCost,
      discount,
      totalAmount: serverTotal,
      couponCode: pending.couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId: verification.transactionUuid,
    })

    // Decrement stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    }
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    // Coupon usage
    if (pending.couponCode) {
      await Coupon.findOneAndUpdate({ code: pending.couponCode.toUpperCase() }, { $inc: { usedCount: 1 } })
    }

    // Notifications + email
    const customer = await User.findById(user._id)
    if (customer?.email) {
      await sendOrderConfirmation(customer.email, {
        orderNumber: order.orderNumber,
        total: order.totalAmount,
        items: orderItems.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image })),
        shippingAddress: pending.shippingAddress as { name: string; street: string; city: string; state: string },
      })
    }
    // Split into per-seller sub-orders and log assignments (awaited before redirect)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await splitOrderBySeller(order._id.toString(), order.orderNumber, orderItems as any).catch(console.error)

    await notifyOrderPlaced(user._id.toString(), order.orderNumber, order._id.toString())
    await notifySellerNewOrder(
      orderItems.map((i) => ({ seller: i.seller, title: i.title })),
      order.orderNumber, order._id.toString(), customer?.name || 'A customer'
    )

    const res = NextResponse.redirect(new URL(`/payment/success?orderId=${order._id}&method=esewa`, req.url))
    res.cookies.delete('esewa-pending')
    return res
  } catch (err) {
    console.error('eSewa verify error:', err)
    return NextResponse.redirect(new URL('/payment/failure?reason=server_error', req.url))
  }
}
