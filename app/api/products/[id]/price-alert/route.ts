export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import mongoose from 'mongoose'

const PriceAlertSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  email:   { type: String, required: true, lowercase: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetPrice: { type: Number, required: true },
  triggered: { type: Boolean, default: false },
}, { timestamps: true })

PriceAlertSchema.index({ product: 1, email: 1 }, { unique: true })
const PriceAlert = mongoose.models.PriceAlert || mongoose.model('PriceAlert', PriceAlertSchema)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { email, targetPrice } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!targetPrice || targetPrice <= 0) {
      return NextResponse.json({ error: 'Valid target price required' }, { status: 400 })
    }

    const product = await Product.findById(params.id).select('title price discountPrice').lean() as { title: string; price: number; discountPrice?: number } | null
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const currentPrice = product.discountPrice || product.price
    if (targetPrice >= currentPrice) {
      return NextResponse.json({ error: `Current price is already ${currentPrice}. Set a lower target.` }, { status: 400 })
    }

    const user = await getAuthUser(req).catch(() => null)

    await PriceAlert.findOneAndUpdate(
      { product: params.id, email: email.toLowerCase() },
      { user: user?._id, targetPrice, triggered: false },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, message: "We'll notify you when the price drops to your target!" })
  } catch (err) {
    console.error('[PriceAlert]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
