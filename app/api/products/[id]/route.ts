import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const product = await Product.findById(params.id)
      .populate('seller', 'name email')
      .lean()

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: product })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const product = await Product.findById(params.id)
    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const updated = await Product.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const product = await Product.findById(params.id)
    if (!product) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await product.deleteOne()
    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
