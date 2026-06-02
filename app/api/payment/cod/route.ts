import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Order from '@/models/Order'
import Coupon from '@/models/Coupon'
import User from '@/models/User'
import { generateTrackingNumber } from '@/lib/utils'
import { sendOrderConfirmation } from '@/lib/email'
import { notifyOrderPlaced, notifySellerNewOrder } from '@/lib/notifications'
import { splitOrderBySeller } from '@/lib/splitOrder'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { shippingAddress, couponCode, deliveryOption = 'standard' } = await req.json()

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    let subtotal = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      if (!product || !product.isApproved || product.stock < item.quantity) {
        return NextResponse.json({ success: false, error: `"${product?.title}" is unavailable` }, { status: 400 })
      }
      const price = product.discountPrice || product.price
      subtotal += price * item.quantity
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

    // COD delivery fee — always charge shipping (no free threshold for COD)
    const shippingCost = deliveryOption === 'express' ? 15.99 : 9.99
    let discount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
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
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: 'cod',
      paymentStatus: 'pending',       // paid on delivery
      status: 'confirmed',
      deliveryOption,
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      couponCode: couponCode || undefined,
      trackingNumber: generateTrackingNumber(),
      invoiceNumber: 'INV-' + Date.now().toString(36).toUpperCase(),
    })

    // Decrement stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    }
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    // Send confirmation email + notification
    const customer = await User.findById(user._id)
    if (customer?.email) {
      await sendOrderConfirmation(customer.email, {
        orderNumber: order.orderNumber,
        total: order.totalAmount,
        items: orderItems.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image })),
        shippingAddress: shippingAddress as { name: string; street: string; city: string; state: string },
      })
    }
    // Split order into per-seller sub-orders (non-blocking)
    splitOrderBySeller(order._id.toString(), order.orderNumber, orderItems).catch(console.error)

    await notifyOrderPlaced(user._id.toString(), order.orderNumber, order._id.toString())
    // Notify all sellers in this order (customer var already declared above)
    await notifySellerNewOrder(
      orderItems.map((i) => ({ seller: i.seller, title: i.title })),
      order.orderNumber,
      order._id.toString(),
      customer?.name || 'A customer'
    )

    return NextResponse.json({ success: true, data: { orderId: order._id, orderNumber: order.orderNumber } }, { status: 201 })
  } catch (err) {
    console.error('COD order error:', err)
    return NextResponse.json({ success: false, error: 'Failed to place order' }, { status: 500 })
  }
}
