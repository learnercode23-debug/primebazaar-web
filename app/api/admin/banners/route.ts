import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Banner from '@/models/Banner'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const position = searchParams.get('position')
    const activeOnly = searchParams.get('active') !== 'false'

    const query: Record<string, unknown> = {}
    if (position) query.position = position
    if (activeOnly) {
      query.isActive = true
      const now = new Date()
      query.$and = [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ]
    }

    const banners = await Banner.find(query).sort({ order: 1 }).lean()
    return NextResponse.json({ success: true, data: banners })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const body = await req.json()
    const banner = await Banner.create({ ...body, createdBy: user._id })
    return NextResponse.json({ success: true, data: banner }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
