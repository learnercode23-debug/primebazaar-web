import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Review from '@/models/Review'
import Product from '@/models/Product'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { productId, rating, title, comment } = await req.json()

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
    })

    // Recalculate product rating
    const reviews = await Review.find({ product: productId })
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
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
