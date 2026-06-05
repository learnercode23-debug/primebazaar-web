export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const u = (await User.findById(user._id).populate({ path: 'wishlist', model: Product }).lean()) as unknown as { wishlist?: unknown[] } | null
    return NextResponse.json({ success: true, data: u?.wishlist || [] })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { productId } = await req.json()
    const u = await User.findById(user._id)
    if (!u) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const idx = u.wishlist.findIndex((id: { toString: () => string }) => id.toString() === productId)
    if (idx >= 0) {
      u.wishlist.splice(idx, 1)
    } else {
      u.wishlist.push(productId)
    }
    await u.save()

    return NextResponse.json({ success: true, data: u.wishlist })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
