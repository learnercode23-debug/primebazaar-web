export const dynamic = 'force-dynamic'
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
import { assignProductSeller } from '@/lib/assignmentEngine'
import CODSettings from '@/models/CODSettings'


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

    // Shipping: same threshold as regular orders (free over Rs.50 / $50)
    const baseShipping = subtotal > 999 ? 0 : 99
    const shippingCost = deliveryOption === 'express' ? 199 : baseShipping

    // Calculate COD handling fee from settings
    const codSettingsForFee = await CODSettings.findOne().lean() as { handlingFee?: number; handlingFeeType?: string } | null
    const codFeeValue = codSettingsForFee?.handlingFee ?? 50
    const codFeeType  = codSettingsForFee?.handlingFeeType ?? 'fixed'
    const codFee = codFeeType === 'percentage'
      ? Math.round(subtotal * codFeeValue / 100)
      : codFeeValue

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

    const totalBeforeCredit = Math.max(0, Math.round((subtotal + shippingCost + codFee - discount) * 100) / 100)

    // Apply store credit from redeemed gift cards (reduces the amount due on delivery)
    const buyer = await User.findById(user._id).select('storeCredit')
    const availableCredit = buyer?.storeCredit || 0
    const storeCreditUsed = Math.min(availableCredit, totalBeforeCredit)
    const totalAmount = Math.max(0, Math.round((totalBeforeCredit - storeCreditUsed) * 100) / 100)

    // Generate 5-digit delivery verification code on placement
    const deliveryCode = String(Math.floor(10000 + Math.random() * 90000))

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: 'cod',
      paymentStatus: 'pending',       // paid on delivery
      status: 'confirmed',
      deliveryCode,
      deliveryCodeGeneratedAt: new Date(),
      deliveryCodeAttempts: 0,
      deliveryCodeLocked: false,
      deliveryOption,
      subtotal,
      shippingCost,
      discount,
      storeCreditUsed,
      totalAmount,
      codFee,
      codRemittanceStatus: 'pending',
      couponCode: couponCode || undefined,
      trackingNumber: generateTrackingNumber(),
    })

    // Deduct the store credit actually used
    if (storeCreditUsed > 0) {
      await User.findByIdAndUpdate(user._id, { $inc: { storeCredit: -storeCreditUsed } })
    }

    // Decrement stock atomically (only if enough remains) — prevents oversell on
    // concurrent last-unit orders.
    for (const item of cart.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      )
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await splitOrderBySeller(order._id.toString(), order.orderNumber, orderItems as any).catch(console.error)

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
