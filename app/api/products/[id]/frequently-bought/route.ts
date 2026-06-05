export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { cacheGet, cacheSet } from '@/lib/redis'
import { getFrequentlyBought } from '@/lib/apriori'
import Product from '@/models/Product'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cacheKey = `fbt:${params.id}`
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    await connectDB()

    // Get association rules for this product
    const rules = await getFrequentlyBought(params.id, 3)

    if (rules.length === 0) {
      // Fallback: same-category products when no rules exist yet
      const anchor = (await Product.findById(params.id).select('category').lean()) as unknown as { category: unknown } | null
      if (anchor) {
        const fallback = await Product.find({
          category: anchor.category,
          _id: { $ne: params.id },
          isApproved: true,
          stock: { $gt: 0 },
        })
          .sort({ salesCount: -1 })
          .limit(3)
          .select('title images price discountPrice rating reviewCount stock brand')
          .lean()

        const result = {
          success: true,
          data: fallback.map((p) => ({
            product: p,
            confidence: null,
            lift: null,
            support: null,
            isFallback: true,
          })),
        }
        await cacheSet(cacheKey, JSON.stringify(result), 120) // short cache for fallback
        return NextResponse.json(result)
      }
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch full product details for each consequent
    const productIds = rules.map((r) => r.productId)
    const products = await Product.find({
      _id: { $in: productIds },
      isApproved: true,
      stock: { $gt: 0 },
    })
      .select('title images price discountPrice rating reviewCount stock brand slug')
      .lean()

    // Preserve lift-sorted order from rules
    const productMap = new Map(products.map((p) => [(p._id as { toString: () => string }).toString(), p]))
    const enriched = rules
      .map((rule) => {
        const product = productMap.get(rule.productId)
        if (!product) return null
        return {
          product,
          confidence: rule.confidence,
          lift: rule.lift,
          support: rule.support,
          coCount: rule.coCount,
          isFallback: false,
        }
      })
      .filter(Boolean)

    const result = { success: true, data: enriched }
    await cacheSet(cacheKey, JSON.stringify(result), 600) // 10 min cache
    return NextResponse.json(result)
  } catch (err) {
    console.error('FBT error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
