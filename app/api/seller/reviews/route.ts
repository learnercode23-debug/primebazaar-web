export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Review from '@/models/Review'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    // Get all product IDs belonging to this seller
    const products = await Product.find({ seller: user._id }).select('_id title').lean()
    const productIds = products.map((p) => p._id)

    const { searchParams } = new URL(req.url)
    const rating = searchParams.get('rating')
    const filter: Record<string, unknown> = { product: { $in: productIds } }
    if (rating) filter.rating = Number(rating)

    const reviews = await Review.find(filter)
      .populate('user', 'name avatar')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .lean()

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0

    const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: reviews.filter((rev) => rev.rating === r).length,
    }))

    return NextResponse.json({
      success: true,
      data: reviews,
      stats: { total: reviews.length, avgRating: Math.round(avgRating * 10) / 10, ratingCounts },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
