export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'
import Order from '@/models/Order'
import { cacheGet, cacheSet } from '@/lib/redis'

type LeanProduct = { category: unknown; price: number; _id: { toString: () => string } }

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cacheKey = `recommendations:${params.id}`
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    await connectDB()

    const product = (await Product.findById(params.id).lean()) as unknown as LeanProduct | null
    if (!product) return NextResponse.json({ success: true, data: [] })

    // Find orders containing this product to discover co-purchased items
    const orders = await Order.find({ 'items.product': params.id })
      .select('items.product')
      .limit(100)
      .lean()

    const coProductIds = new Set<string>()
    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.product.toString()
        if (pid !== params.id) coProductIds.add(pid)
      }
    }

    let recommended: Record<string, unknown>[] = []

    if (coProductIds.size >= 4) {
      const ids = Array.from(coProductIds).slice(0, 20)
      recommended = (await Product.find({ _id: { $in: ids }, isApproved: true })
        .populate('seller', 'name')
        .sort({ rating: -1 })
        .limit(8)
        .lean()) as Record<string, unknown>[]
    }

    // Fallback: same category, similar price
    if (recommended.length < 4) {
      const fallback = (await Product.find({
        category: product.category,
        _id: { $ne: params.id },
        isApproved: true,
        price: { $gte: product.price * 0.5, $lte: product.price * 2 },
      })
        .populate('seller', 'name')
        .sort({ salesCount: -1, rating: -1 })
        .limit(8 - recommended.length)
        .lean()) as Record<string, unknown>[]

      recommended = [...recommended, ...fallback]
    }

    const result = { success: true, data: recommended }
    await cacheSet(cacheKey, JSON.stringify(result), 600)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
