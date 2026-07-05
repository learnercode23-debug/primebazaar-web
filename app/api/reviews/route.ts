export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Review from '@/models/Review'
import Product from '@/models/Product'
import Order from '@/models/Order'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { productId, rating, title, comment, photos } = await req.json()

    // Purchase gating — a user may only review a product they actually received.
    const purchased = await Order.findOne({
      user: user._id,
      'items.product': productId,
      status: 'delivered',
    }).select('_id').lean()
    if (!purchased) {
      return NextResponse.json({ success: false, error: 'You can only review products from your delivered orders.' }, { status: 403 })
    }

    const existing = await Review.findOne({ user: user._id, product: productId })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Already reviewed this product' }, { status: 409 })
    }

    const review = await Review.create({
      user: user._id,
      product: productId,
      rating,
      title,
      comment,
      photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
      verified: true,
    })

    // Recalculate product rating (approved reviews only)
    const reviews = await Review.find({ product: productId, isApproved: { $ne: false } })
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avg * 10) / 10,
      reviewCount: reviews.length,
    })

    await review.populate('user', 'name avatar')
    return NextResponse.json({ success: true, data: review }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
