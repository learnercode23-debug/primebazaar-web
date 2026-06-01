import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { generateTrackingNumber } from '@/lib/utils'
import { notifyOrderPlaced, notifySellerNewOrder } from '@/lib/notifications'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const query = user.role === 'admin' ? {} : { user: user._id }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ])

    return NextResponse.json({ success: true, data: orders, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { shippingAddress, paymentMethod, couponCode, stripePaymentIntentId } = await req.json()

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    let subtotal = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      if (!product || !product.isApproved || product.stock < item.quantity) {
        return NextResponse.json({ success: false, error: `Product ${product?.title || ''} is unavailable` }, { status: 400 })
      }
      const price = product.discountPrice || product.price
      subtotal += price * item.quantity
      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0] || '',
        price,
        quantity: item.quantity,
        seller: product.seller,
      })
    }

    const shippingCost = subtotal > 50 ? 0 : 5.99
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
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
        } else {
          discount = coupon.discountValue
        }
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } })
      }
    }

    const totalAmount = Math.max(0, subtotal + shippingCost - discount)

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: stripePaymentIntentId ? 'paid' : 'pending',
      status: 'confirmed',
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId,
    })

    // Decrement stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    // Notify customer + all sellers in the order
    const customer = await User.findById(user._id).select('name').lean() as { name?: string } | null
    await notifyOrderPlaced(user._id.toString(), order.orderNumber, order._id.toString())
    await notifySellerNewOrder(
      orderItems.map((i) => ({ seller: i.seller, title: i.title })),
      order.orderNumber,
      order._id.toString(),
      customer?.name || 'A customer'
    )

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
