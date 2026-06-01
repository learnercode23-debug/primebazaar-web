import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: true, data: [] })

    await connectDB()
    const u = await User.findById(user._id)
      .populate({
        path: 'recentlyViewed',
        model: Product,
        match: { isApproved: true },
        options: { limit: 12 },
      })
      .select('recentlyViewed')
    return NextResponse.json({ success: true, data: u?.recentlyViewed || [] })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: true }) // no-op for guests

    await connectDB()
    const { productId } = await req.json()
    const u = await User.findById(user._id)
    if (!u) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    // Remove existing occurrence
    u.recentlyViewed = u.recentlyViewed.filter((id: unknown) => String(id) !== productId) as typeof u.recentlyViewed
    // Add to front
    u.recentlyViewed.unshift(productId)
    // Keep only last 20
    u.recentlyViewed = u.recentlyViewed.slice(0, 20)

    await User.findByIdAndUpdate(user._id, { recentlyViewed: u.recentlyViewed })
    // Also increment product viewCount
    await Product.findByIdAndUpdate(productId, { $inc: { viewCount: 1 } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
