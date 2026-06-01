import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Coupon from '@/models/Coupon'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { code, subtotal } = await req.json()

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    })

    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Invalid or expired coupon' }, { status: 404 })
    }

    if (subtotal < coupon.minPurchase) {
      return NextResponse.json({
        success: false,
        error: `Minimum purchase of $${coupon.minPurchase} required`,
      }, { status: 400 })
    }

    let discount = 0
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    } else {
      discount = coupon.discountValue
    }

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: Math.round(discount * 100) / 100,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
