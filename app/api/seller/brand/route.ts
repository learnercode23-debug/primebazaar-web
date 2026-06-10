export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerBrand from '@/models/SellerBrand'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const brand = await SellerBrand.findOne({ seller: user._id }).lean()
    return NextResponse.json({ data: brand })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const body = await req.json()
    if (!body.brandName?.trim()) return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    const update = {
      brandName: body.brandName.trim(),
      tagline: body.tagline?.trim() || '',
      story: body.story || '',
      logoUrl: body.logoUrl?.trim() || '',
      bannerUrl: body.bannerUrl?.trim() || '',
      websiteUrl: body.websiteUrl?.trim() || '',
      contactEmail: body.contactEmail?.trim() || '',
      features: Array.isArray(body.features) ? body.features.filter((f: string) => f && f.trim()) : [],
    }
    const brand = await SellerBrand.findOneAndUpdate(
      { seller: user._id },
      { $set: update, $setOnInsert: { seller: user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return NextResponse.json({ data: brand })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
