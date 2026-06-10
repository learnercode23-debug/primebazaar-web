export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import AdCampaign from '@/models/AdCampaign'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const campaigns = await AdCampaign.find({ seller: user._id }).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ data: campaigns })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const { productId, type, budget, bid, startDate, endDate, keywords } = await req.json()
    if (!productId || !budget) return NextResponse.json({ error: 'Product and budget are required' }, { status: 400 })

    const product = await Product.findById(productId).select('title images seller').lean<{ title: string; images: string[]; seller: { toString(): string } } | null>()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    // Sellers can only advertise their own products
    if (user.role !== 'admin' && product.seller.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'You can only advertise your own products' }, { status: 403 })
    }

    const campaign = await AdCampaign.create({
      seller: user._id,
      product: productId,
      productTitle: product.title,
      productImage: product.images?.[0] || '',
      type: type === 'auto' ? 'auto' : 'manual',
      status: 'active',
      budget: Number(budget),
      bid: Number(bid) || 5,
      keywords: Array.isArray(keywords) ? keywords : [],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
    return NextResponse.json({ data: campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const { id, status, keywords } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const update: Record<string, unknown> = {}
    if (status && ['active', 'paused', 'ended'].includes(status)) update.status = status
    if (Array.isArray(keywords)) update.keywords = keywords
    const campaign = await AdCampaign.findOneAndUpdate({ _id: id, seller: user._id }, update, { new: true })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    return NextResponse.json({ data: campaign })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await AdCampaign.findOneAndDelete({ _id: id, seller: user._id })
    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
