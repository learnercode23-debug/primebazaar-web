export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import User from '@/models/User'
import { verifyKhaltiPayment } from '@/lib/khalti'
import { generateTrackingNumber } from '@/lib/utils'
import { sendOrderConfirmation } from '@/lib/email'
import { notifyOrderPlaced, notifySellerNewOrder } from '@/lib/notifications'
import { splitOrderBySeller } from '@/lib/splitOrder'
import { assignProductSeller } from '@/lib/assignmentEngine'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pidx = searchParams.get('pidx')
  const status = searchParams.get('status') // Khalti passes "Completed" or "User canceled"

  if (!pidx || status === 'User canceled') {
    return NextResponse.redirect(new URL('/payment/failure?reason=cancelled', req.url))
  }

  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    // Demo mode is a SERVER decision (no real key), never something the client's pidx can assert.
    // Once a live Khalti key is configured, a "DEMO-" pidx is treated as invalid and fails verification.
    const liveKeyConfigured = !!process.env.KHALTI_SECRET_KEY && !process.env.KHALTI_SECRET_KEY.includes('test')
    const isDemoMode = pidx.startsWith('DEMO-') && !liveKeyConfigured

    let paidAmountPaisa: number | null = null
    if (!isDemoMode) {
      const verification = await verifyKhaltiPayment(pidx)
      if (verification.status !== 'Completed') {
        return NextResponse.redirect(
          new URL(`/payment/failure?reason=${encodeURIComponent(verification.status)}`, req.url)
        )
      }
      paidAmountPaisa = verification.total_amount
    }

    await connectDB()

    // Idempotency — this pidx may back at most one order (block replay).
    const already = await Order.findOne({ stripePaymentIntentId: pidx }).select('_id').lean()
    if (already) {
      return NextResponse.redirect(new URL(`/payment/success?orderId=${(already as { _id: string })._id}&method=khalti`, req.url))
    }

    const pendingCookie = req.cookies.get('khalti-pending')?.value
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
      purchaseOrderId: string
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

    // In live mode, the amount Khalti confirmed (paisa) must match this cart's cost.
    if (paidAmountPaisa != null && Math.abs(paidAmountPaisa - Math.round(serverTotal * 100)) > 100) {
      return NextResponse.redirect(new URL('/payment/failure?reason=amount_mismatch', req.url))
    }

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: pending.shippingAddress,
      paymentMethod: 'khalti',
      paymentStatus: 'paid',
      status: 'confirmed',
      subtotal: serverSubtotal,
      shippingCost,
      discount,
      totalAmount: serverTotal,
      couponCode: pending.couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId: pidx,
    })

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    }
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    if (pending.couponCode) {
      await Coupon.findOneAndUpdate({ code: pending.couponCode.toUpperCase() }, { $inc: { usedCount: 1 } })
    }

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

    const res = NextResponse.redirect(new URL(`/payment/success?orderId=${order._id}&method=khalti`, req.url))
    res.cookies.delete('khalti-pending')
    return res
  } catch (err) {
    console.error('Khalti verify error:', err)
    return NextResponse.redirect(new URL('/payment/failure?reason=server_error', req.url))
  }
}
