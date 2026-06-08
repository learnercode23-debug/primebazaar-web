export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import StockAlert from '@/models/StockAlert'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const product = await Product.findById(params.id).select('stock title').lean() as { stock: number; title: string } | null
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (product.stock > 0) return NextResponse.json({ error: 'Product is currently in stock' }, { status: 400 })

    const user = await getAuthUser(req).catch(() => null)

    await StockAlert.findOneAndUpdate(
      { product: params.id, email: email.toLowerCase() },
      { user: user?._id },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, message: "You'll be notified when this is back in stock!" })
  } catch (err) {
    console.error('[StockAlert]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}