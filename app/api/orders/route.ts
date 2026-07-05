export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { generateTrackingNumber } from '@/lib/utils'
import { notifyOrderPlaced, notifySellerNewOrder, notifyLowStock } from '@/lib/notifications'
import { splitOrderBySeller } from '@/lib/splitOrder'
import { assignProductSeller } from '@/lib/assignmentEngine'
import User from '@/models/User'
import { runAprioriMining } from '@/lib/apriori'
import { stripe } from '@/lib/stripe'

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

      // Use assignment engine to pick the best seller (handles multi-seller products)
      const assignment = await assignProductSeller(
        product._id.toString(),
        product.seller.toString(),
        item.quantity
      )

      orderItems.push({
        product:           product._id,
        title:             product.title,
        image:             product.images[0] || '',
        price,
        quantity:          item.quantity,
        seller:            assignment.sellerId,     // assigned seller (may differ from product.seller)
        assignmentRule:    assignment.rule,
        assignmentReason:  assignment.reason,
      })
    }

    const shippingCost = subtotal > 999 ? 0 : 99
    let discount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
      })

      if (coupon && subtotal >= coupon.minPurchase) {
        // Atomically claim one use only if still under the limit — prevents
        // concurrent orders from exceeding usageLimit (TOCTOU race).
        const claimed = await Coupon.findOneAndUpdate(
          { _id: coupon._id, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          { $inc: { usedCount: 1 } },
          { new: true }
        )
        if (claimed) {
          if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountValue) / 100
            if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
          } else {
            discount = coupon.discountValue
          }
        }
      }
    }

    const totalAmount = Math.max(0, subtotal + shippingCost - discount)

    // Never trust a client-supplied payment id. Verify the intent with Stripe:
    // it must have succeeded, be for this exact amount, and belong to this user.
    let paymentStatus: 'paid' | 'pending' = 'pending'
    if (stripePaymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
        const amountMatches = intent.amount === Math.round(totalAmount * 100)
        const ownerMatches = intent.metadata?.userId === user._id.toString()
        if (intent.status !== 'succeeded' || !amountMatches || !ownerMatches) {
          return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 })
        }
        paymentStatus = 'paid'
      } catch {
        return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 })
      }
    }

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      couponCode,
      trackingNumber: generateTrackingNumber(),
      stripePaymentIntentId,
    })

    // Decrement stock + alert seller when critically low
    for (const item of cart.items) {
      const updated = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { new: true }
      ).select('stock seller title')
      if (updated && updated.stock <= 3) {
        notifyLowStock(updated.seller.toString(), updated.title, updated.stock).catch(() => {})
      }
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: user._id }, { items: [] })

    // Notify customer + all sellers in the order
    const customer = await User.findById(user._id).select('name').lean() as { name?: string } | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await splitOrderBySeller(order._id.toString(), order.orderNumber, orderItems as any).catch(console.error)
    await notifyOrderPlaced(user._id.toString(), order.orderNumber, order._id.toString())
    await notifySellerNewOrder(
      orderItems.map((i) => ({ seller: i.seller, title: i.title })),
      order.orderNumber,
      order._id.toString(),
      customer?.name || 'A customer'
    )

    // Retrain Apriori rules in background — non-blocking, fire and forget
    runAprioriMining({ minSupport: 0.005, minConfidence: 0.02, minLift: 1.0, paidOnly: false }).catch(() => {})

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
