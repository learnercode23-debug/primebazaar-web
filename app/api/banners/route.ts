export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Banner from '@/models/Banner'

// Public endpoint — returns active banners for the storefront (no auth).
export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const position = new URL(req.url).searchParams.get('position') || 'hero'
    const now = new Date()
    const banners = await Banner.find({
      position,
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .sort({ order: 1 })
      .select('title subtitle image mobileImage link buttonText backgroundColor textColor')
      .lean()
    return NextResponse.json({ success: true, data: banners })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
