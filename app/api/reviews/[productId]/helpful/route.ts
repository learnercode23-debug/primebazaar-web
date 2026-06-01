import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Review from '@/models/Review'

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { reviewId, vote } = await req.json() // vote: 'helpful' | 'unhelpful'

    const review = await Review.findById(reviewId)
    if (!review) return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 })

    const uid = user._id

    if (vote === 'helpful') {
      if (review.helpfulVotes.some((id: { toString: () => string }) => id.toString() === uid.toString())) {
        // Toggle off
        review.helpfulVotes = review.helpfulVotes.filter((id: { toString: () => string }) => id.toString() !== uid.toString())
      } else {
        review.helpfulVotes.push(uid)
        review.unhelpfulVotes = review.unhelpfulVotes.filter((id: { toString: () => string }) => id.toString() !== uid.toString())
      }
    } else {
      if (review.unhelpfulVotes.some((id: { toString: () => string }) => id.toString() === uid.toString())) {
        review.unhelpfulVotes = review.unhelpfulVotes.filter((id: { toString: () => string }) => id.toString() !== uid.toString())
      } else {
        review.unhelpfulVotes.push(uid)
        review.helpfulVotes = review.helpfulVotes.filter((id: { toString: () => string }) => id.toString() !== uid.toString())
      }
    }

    review.helpfulCount = review.helpfulVotes.length
    await review.save()

    return NextResponse.json({
      success: true,
      data: { helpful: review.helpfulVotes.length, unhelpful: review.unhelpfulVotes.length },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
