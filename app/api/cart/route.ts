export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Cart from '@/models/Cart'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const cart = await Cart.findOne({ user: user._id })
      .populate({ path: 'items.product', model: Product })
      .lean()

    return NextResponse.json({ success: true, data: cart || { items: [] } })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { productId, quantity = 1 } = await req.json()

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid product' }, { status: 400 })
    }

    const product = await Product.findById(productId)
    if (!product || !product.isApproved) {
      return NextResponse.json({ success: false, error: 'Product not available' }, { status: 404 })
    }
    if (product.stock < quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 })
    }

    let cart = await Cart.findOne({ user: user._id })
    if (!cart) {
      cart = new Cart({ user: user._id, items: [] })
    }

    const existingIdx = cart.items.findIndex(
      (item: { product: { toString: () => string } }) => item.product.toString() === productId
    )

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity = Math.min(
        cart.items[existingIdx].quantity + quantity,
        product.stock
      )
    } else {
      cart.items.push({ product: product._id, quantity })
    }

    await cart.save()
    await cart.populate({ path: 'items.product', model: Product })

    return NextResponse.json({ success: true, data: cart })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { productId, quantity } = await req.json()

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid product' }, { status: 400 })
    }

    const cart = await Cart.findOne({ user: user._id })
    if (!cart) return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 })

    const idx = cart.items.findIndex((item: { product: { toString: () => string } }) => item.product.toString() === productId)
    if (idx < 0) return NextResponse.json({ success: false, error: 'Item not in cart' }, { status: 404 })

    if (quantity <= 0) {
      cart.items.splice(idx, 1)
    } else {
      cart.items[idx].quantity = quantity
    }

    await cart.save()
    await cart.populate({ path: 'items.product', model: Product })
    return NextResponse.json({ success: true, data: cart })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    // DELETE with no body = clear the whole cart; with { productId } = remove one item
    const body = await req.json().catch(() => ({} as { productId?: string }))
    const { productId } = body

    const cart = await Cart.findOne({ user: user._id })
    if (!cart) return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 })

    if (productId) {
      cart.items = cart.items.filter((item: { product: { toString: () => string } }) => item.product.toString() !== productId)
    } else {
      cart.items = []
    }

    await cart.save()
    return NextResponse.json({ success: true, data: cart })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
