import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'
import { cacheGet, cacheSet } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const cacheKey = `search:suggest:${q.toLowerCase()}:${limit}`
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    await connectDB()

    const products = await Product.find(
      {
        isApproved: true,
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } },
        ],
      },
      { title: 1, images: 1, price: 1, discountPrice: 1, brand: 1, rating: 1, slug: 1 }
    )
      .sort({ salesCount: -1, rating: -1 })
      .limit(limit)
      .lean()

    // Also get matching brands and categories
    const brands = await Product.distinct('brand', {
      isApproved: true,
      brand: { $regex: q, $options: 'i' },
    })

    const result = {
      success: true,
      data: {
        products,
        brands: brands.slice(0, 4),
        suggestions: [
          q,
          ...products.slice(0, 3).map((p) => p.brand + ' ' + q),
        ].filter((s, i, a) => a.indexOf(s) === i).slice(0, 5),
      },
    }

    await cacheSet(cacheKey, JSON.stringify(result), 60)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
