export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import PricingRule from '@/models/PricingRule'
import { createNotification } from '@/lib/notifications'

const DEFAULT_RULES = [
  { key: 'demand-surge',     name: 'Demand-Based Surge',  type: 'demand',     enabled: true,  description: 'Increase price by 5% when a product has high sales velocity (50+ units sold).' },
  { key: 'low-stock-premium', name: 'Low Stock Premium',  type: 'inventory',  enabled: true,  description: 'Apply a +10% premium when stock drops to 5 units or fewer.' },
  { key: 'slow-mover',       name: 'Slow-Mover Discount', type: 'time',       enabled: false, description: 'Apply -15% on in-stock products with no sales yet to stimulate demand.' },
  { key: 'competitor-match', name: 'Competitor Price Match', type: 'competitor', enabled: false, description: 'Match the market average price (requires a competitor price feed).' },
]

async function ensureRules() {
  const count = await PricingRule.countDocuments()
  if (count === 0) await PricingRule.insertMany(DEFAULT_RULES)
}

interface LeanProduct {
  _id: { toString(): string }
  title: string
  price: number
  discountPrice?: number
  stock: number
  salesCount: number
  seller?: { name?: string }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    await ensureRules()
    const rules = await PricingRule.find().sort({ createdAt: 1 }).lean()
    const enabledTypes = new Set(rules.filter(r => r.enabled).map(r => r.type))

    const products = await Product.find({ isApproved: true })
      .select('title price discountPrice stock salesCount seller')
      .populate('seller', 'name')
      .sort({ salesCount: -1 })
      .limit(300)
      .lean<LeanProduct[]>()

    const suggestions: Array<Record<string, unknown>> = []
    for (const p of products) {
      const cur = p.discountPrice || p.price
      if (!cur || cur <= 0) continue
      const sellerName = p.seller?.name || 'Unknown'
      // One suggestion per product, highest-priority rule first
      if (enabledTypes.has('inventory') && p.stock > 0 && p.stock <= 5) {
        suggestions.push({ productId: p._id.toString(), title: p.title, currentPrice: cur, suggestedPrice: Math.round(cur * 1.10), reason: `Only ${p.stock} unit${p.stock === 1 ? '' : 's'} left in stock`, change: 10, confidence: 90, type: 'inventory', sellerName })
      } else if (enabledTypes.has('demand') && (p.salesCount || 0) >= 50) {
        suggestions.push({ productId: p._id.toString(), title: p.title, currentPrice: cur, suggestedPrice: Math.round(cur * 1.05), reason: `High demand — ${p.salesCount} sold`, change: 5, confidence: 85, type: 'demand', sellerName })
      } else if (enabledTypes.has('time') && (p.salesCount || 0) === 0 && p.stock > 0) {
        suggestions.push({ productId: p._id.toString(), title: p.title, currentPrice: cur, suggestedPrice: Math.round(cur * 0.85), reason: 'No sales yet — discount to stimulate demand', change: -15, confidence: 78, type: 'time', sellerName })
      }
    }
    suggestions.sort((a, b) => (b.confidence as number) - (a.confidence as number))

    return NextResponse.json({ data: { rules, suggestions: suggestions.slice(0, 20) } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { key, enabled } = await req.json()
    if (!key || typeof enabled !== 'boolean') return NextResponse.json({ error: 'key and enabled required' }, { status: 400 })
    const rule = await PricingRule.findOneAndUpdate({ key }, { enabled }, { new: true })
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json({ data: rule })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { productId, suggestedPrice } = await req.json()
    if (!productId || !suggestedPrice || suggestedPrice <= 0) {
      return NextResponse.json({ error: 'productId and valid suggestedPrice required' }, { status: 400 })
    }
    const product = await Product.findById(productId).select('title seller').lean<{ title: string; seller: { toString(): string } } | null>()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    const newPrice = Math.round(suggestedPrice)
    await Product.updateOne({ _id: productId }, { $set: { price: newPrice }, $unset: { discountPrice: 1, discountPercent: 1 } })
    await createNotification(
      product.seller.toString(),
      'admin_alert',
      'Price updated by Dynamic Pricing AI',
      `The price of "${product.title}" was updated to Rs.${newPrice.toLocaleString()} by PrimePasal Dynamic Pricing.`,
      '/seller/products'
    )
    return NextResponse.json({ data: { success: true, newPrice } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
