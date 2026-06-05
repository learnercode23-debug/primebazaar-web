export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Review from '@/models/Review'

export async function GET(_: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await connectDB()
    const reviews = await Review.find({ product: params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, data: reviews })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
