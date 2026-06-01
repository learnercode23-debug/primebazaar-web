import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { buildEsewaFormFields, ESEWA_PAYMENT_URL } from '@/lib/esewa'
import { generateTrackingNumber } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { shippingAddress, couponCode } = await req.json()

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    let subtotal = 0
    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      const price = product.discountPrice || product.price
      subtotal += price * item.quantity
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
        discount = coupon.discountType === 'percentage'
          ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
          : coupon.discountValue
      }
    }

    const totalAmount = Math.max(0, Math.round((subtotal + shippingCost - discount) * 100) / 100)

    // Create a unique transaction UUID for this payment attempt
    const transactionUuid = generateTrackingNumber() + '-ESEWA'

    // Store pending payment intent in session/cookie so verify route can finish the order
    const pendingData = JSON.stringify({ shippingAddress, couponCode, subtotal, shippingCost, discount, totalAmount, transactionUuid })

    const fields = buildEsewaFormFields({
      amount: subtotal + shippingCost - discount,
      taxAmount: 0,
      totalAmount,
      transactionUuid,
      successUrl: `${origin}/payment/esewa/success`,
      failureUrl: `${origin}/payment/esewa/failure`,
    })

    const res = NextResponse.json({
      success: true,
      data: {
        paymentUrl: ESEWA_PAYMENT_URL,
        fields,
        transactionUuid,
      },
    })

    // Persist pending order data in a short-lived cookie
    res.cookies.set('esewa-pending', Buffer.from(pendingData).toString('base64'), {
      httpOnly: true,
      maxAge: 60 * 30, // 30 minutes
      path: '/',
      sameSite: 'lax',
    })

    return res
  } catch (err) {
    console.error('eSewa initiate error:', err)
    return NextResponse.json({ success: false, error: 'Failed to initiate payment' }, { status: 500 })
  }
}
