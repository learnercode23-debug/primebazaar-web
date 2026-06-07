export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Coupon from '@/models/Coupon'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  await connectDB()
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json({ success: true, data: coupons })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  await connectDB()
  const { code, discountType, discountValue, minPurchase, maxDiscount, validFrom, validTo, usageLimit } = await req.json()
  if (!code || !discountType || discountValue == null || !validFrom || !validTo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType, discountValue: Number(discountValue),
      minPurchase: Number(minPurchase) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      usageLimit: Number(usageLimit) || 100,
      isActive: true,
      createdBy: user._id,
    })
    return NextResponse.json({ success: true, data: coupon }, { status: 201 })
  } catch (err: unknown) {
    const msg = (err as { code?: number })?.code === 11000 ? 'Coupon code already exists' : 'Server error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
