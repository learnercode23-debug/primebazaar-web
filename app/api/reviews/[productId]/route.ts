export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Review from '@/models/Review'
import { isValidObjectId } from '@/lib/utils'

export async function GET(_: NextRequest, { params }: { params: { productId: string } }) {
  try {
    if (!isValidObjectId(params.productId)) return NextResponse.json({ success: true, data: [] })
    await connectDB()
    // Only show approved reviews — a review an admin removed must disappear from the storefront.
    const reviews = await Review.find({ product: params.productId, isApproved: { $ne: false } })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, data: reviews })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
