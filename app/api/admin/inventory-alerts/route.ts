export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import Notification from '@/models/Notification'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const threshold = parseInt(new URL(req.url).searchParams.get('threshold') || '10')
    const products = await Product.find({ stock: { $lte: threshold }, isApproved: true })
      .populate('seller', 'name email')
      .populate('category', 'name')
      .sort({ stock: 1 })
      .limit(100)
      .lean()
    return NextResponse.json({ data: products, threshold })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { productId, sellerId } = await req.json()
    const seller = await User.findById(sellerId).lean()
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    await Notification.create({
      user: new mongoose.Types.ObjectId(sellerId),
      type: 'stock_low',
      title: 'Low stock alert',
      message: 'One of your products is running low on stock. Please restock soon to avoid lost sales.',
      link: `/seller/products/${productId}`,
    })
    return NextResponse.json({ data: { sent: true } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
