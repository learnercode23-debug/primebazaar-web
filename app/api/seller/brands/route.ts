export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import BrandApplication from '@/models/BrandApplication'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const apps = await BrandApplication.find({ seller: user._id }).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ data: apps })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Only sellers can apply' }, { status: 403 })
    }
    await connectDB()
    const { brandName, website, category, tradeMark, trademarkNumber } = await req.json()
    if (!brandName?.trim() || !category?.trim()) {
      return NextResponse.json({ error: 'Brand name and category are required' }, { status: 400 })
    }
    // Prevent duplicate pending applications for the same brand by the same seller
    const existing = await BrandApplication.findOne({ seller: user._id, brandName: brandName.trim(), status: 'pending' })
    if (existing) return NextResponse.json({ error: 'You already have a pending application for this brand' }, { status: 409 })

    const app = await BrandApplication.create({
      seller: user._id,
      brandName: brandName.trim(),
      website: website?.trim() || undefined,
      category: category.trim(),
      tradeMark: !!tradeMark,
      trademarkNumber: trademarkNumber?.trim() || undefined,
    })
    return NextResponse.json({ data: app }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
