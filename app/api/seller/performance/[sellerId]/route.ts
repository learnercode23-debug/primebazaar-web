export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import SellerPerformance from '@/models/SellerPerformance'

export async function GET(_req: NextRequest, { params }: { params: { sellerId: string } }) {
  try {
    await connectDB()
    const perf = await SellerPerformance.findOne({ seller: params.sellerId }).lean() as {
      overallScore?: number
      delivered?: number
      acceptanceRate?: number
    } | null

    if (!perf) return NextResponse.json({ success: true, data: null })

    // Convert overallScore (0-100) to a 5-star rating
    const avgRating = perf.overallScore ? Math.round((perf.overallScore / 100) * 5 * 10) / 10 : 0

    return NextResponse.json({
      success: true,
      data: {
        avgRating,
        totalOrders: perf.delivered || 0,
        acceptanceRate: perf.acceptanceRate || 0,
      },
    })
  } catch {
    return NextResponse.json({ success: false, data: null })
  }
}
