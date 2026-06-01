import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import Coupon from '@/models/Coupon'
import { initiateKhaltiPayment } from '@/lib/khalti'
import { generateTrackingNumber } from '@/lib/utils'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { shippingAddress, couponCode } = await req.json()

    const cart = await Cart.findOne({ user: user._id }).populate({ path: 'items.product', model: Product })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }

    let subtotal = 0
    const itemLabels: string[] = []
    for (const item of cart.items) {
      const product = item.product as InstanceType<typeof Product>
      const price = product.discountPrice || product.price
      subtotal += price * item.quantity
      itemLabels.push(`${product.title} ×${item.quantity}`)
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
    const purchaseOrderId = generateTrackingNumber() + '-KHALTI'
    const isExampleKey = (process.env.KHALTI_SECRET_KEY || '').startsWith('test_secret_key_dc74e0fd')
    // Use request origin so the demo redirect goes to the correct port (3002, 3000, etc.)
    const requestOrigin = new URL(req.url).origin

    // Persist pending order data in cookie for the verify step
    const pendingData = JSON.stringify({
      shippingAddress, couponCode, subtotal, shippingCost, discount, totalAmount, purchaseOrderId,
    })

    // DEMO MODE: when using the example/placeholder key (not a real registered sandbox key),
    // skip the Khalti API call and redirect to our demo Khalti page.
    if (isExampleKey) {
      const demoResponse = NextResponse.json({
        success: true,
        data: {
          paymentUrl: `${requestOrigin}/payment/khalti/demo?amount=${totalAmount}&orderId=${purchaseOrderId}`,
          pidx: `DEMO-${purchaseOrderId}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          demoMode: true,
        },
      })
      demoResponse.cookies.set('khalti-pending', Buffer.from(pendingData).toString('base64'), {
        httpOnly: true, maxAge: 60 * 30, path: '/', sameSite: 'lax',
      })
      return demoResponse
    }

    // LIVE MODE: call Khalti API with real keys
    const khaltiRes = await initiateKhaltiPayment({
      returnUrl: `${BASE_URL}/api/payment/khalti/verify`,
      websiteUrl: BASE_URL,
      amountNPR: totalAmount,
      purchaseOrderId,
      purchaseOrderName: itemLabels.slice(0, 2).join(', ') + (itemLabels.length > 2 ? ` +${itemLabels.length - 2} more` : ''),
      customerName: user.name,
    })

    const response = NextResponse.json({
      success: true,
      data: {
        paymentUrl: khaltiRes.paymentUrl,
        pidx: khaltiRes.pidx,
        expiresAt: khaltiRes.expiresAt,
        demoMode: false,
      },
    })

    response.cookies.set('khalti-pending', Buffer.from(pendingData).toString('base64'), {
      httpOnly: true,
      maxAge: 60 * 30,
      path: '/',
      sameSite: 'lax',
    })

    return response
  } catch (err) {
    console.error('Khalti initiate error:', err)
    return NextResponse.json({ success: false, error: 'Failed to initiate Khalti payment' }, { status: 500 })
  }
}
