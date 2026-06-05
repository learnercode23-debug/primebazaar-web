export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Review from '@/models/Review'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const { searchParams } = new URL(req.url)
    const flagged = searchParams.get('flagged') === 'true'
    const query: Record<string, unknown> = {}
    if (flagged) query.isFlagged = true

    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    return NextResponse.json({ success: true, data: reviews })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const { reviewId, action } = await req.json()
    const update: Record<string, unknown> = {}
    if (action === 'approve') update.isApproved = true
    if (action === 'remove') update.isApproved = false
    if (action === 'unflag') update.isFlagged = false

    await Review.findByIdAndUpdate(reviewId, update)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
