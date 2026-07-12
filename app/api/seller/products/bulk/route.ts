export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'
import { parse } from 'csv-parse/sync'
import { escapeRegex } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })

    const results = { created: 0, errors: [] as string[] }

    for (const row of records) {
      try {
        // Find category by exact (case-insensitive) name — escape to avoid regex injection/ReDoS
        const category = await Category.findOne({ name: { $regex: `^${escapeRegex(String(row.category || ''))}$`, $options: 'i' } })
        if (!category) {
          results.errors.push(`Row "${row.title}": category "${row.category}" not found`)
          continue
        }

        const price = parseFloat(row.price)
        const discountPrice = row.discount_price ? parseFloat(row.discount_price) : undefined
        const stock = parseInt(row.stock) || 0

        await Product.create({
          title: row.title,
          description: row.description || row.title,
          price,
          discountPrice,
          discountPercent: discountPrice ? Math.round(((price - discountPrice) / price) * 100) : undefined,
          category: category._id,
          brand: row.brand || 'Generic',
          images: row.image ? [row.image] : [],
          stock,
          seller: user._id,
          isApproved: false,
          tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
          featureBullets: row.bullets ? row.bullets.split('|').map((b: string) => b.trim()) : [],
        })
        results.created++
      } catch (err) {
        results.errors.push(`Row "${row.title}": ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.created} products created, ${results.errors.length} errors`,
      data: results,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Failed to process CSV' }, { status: 500 })
  }
}
