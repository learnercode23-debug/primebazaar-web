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

    const isDemoMode = pidx.startsWith('DEMO-')

    // LIVE MODE: verify with Khalti API
    if (!isDemoMode) {
      const verification = await verifyKhaltiPayment(pidx)
      if (verification.status !== 'Completed') {
        return NextResponse.redirect(
          new URL(`/payment/failure?reason=${encodeURIComponent(verification.status)}`, req.url)
        )
      }
    }
    // DEMO MODE: status=Completed is passed directly from the demo page

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

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: pending.shippingAddress,
      paymentMethod: 'khalti',
      paymentStatus: 'paid',
      status: 'confirmed',
      subtotal: pending.subtotal,
      shippingCost: pending.shippingCost,
      discount: pending.discount,
      totalAmount: pending.totalAmount,
      couponCode: pending.couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId: pidx,
      invoiceNumber: 'INV-' + Date.now().toString(36).toUpperCase(),
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
