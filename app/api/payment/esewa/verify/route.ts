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
    if (!verification.success) {
      return NextResponse.redirect(new URL('/payment/failure?reason=verification_failed', req.url))
    }

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
    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      const price = product.discountPrice || product.price
      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0] || '',
        price,
        originalPrice: product.price,
        quantity: item.quantity,
        seller: product.seller,
      })
    }

    // Create the order
    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: pending.shippingAddress,
      paymentMethod: 'esewa',
      paymentStatus: 'paid',
      status: 'confirmed',
      subtotal: pending.subtotal,
      shippingCost: pending.shippingCost,
      discount: pending.discount,
      totalAmount: pending.totalAmount,
      couponCode: pending.couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId: verification.transactionUuid,
      invoiceNumber: 'INV-' + Date.now().toString(36).toUpperCase(),
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
