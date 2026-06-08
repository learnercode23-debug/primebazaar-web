export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'
import StockAlert from '@/models/StockAlert'
import { sendBackInStockEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

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

    // Resolve category name/slug → ObjectId
    if (body.category && typeof body.category === 'string' && body.category.length < 24) {
      const cat = await Category.findOne({
        $or: [{ slug: body.category.toLowerCase() }, { name: { $regex: new RegExp(`^${body.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }]
      }).select('_id')
      if (cat) body.category = cat._id
    }

    const oldStock = product.stock
    const updated = await Product.findByIdAndUpdate(params.id, body, { new: true, runValidators: true })

    // Back-in-stock: notify all subscribers if stock went from 0 to > 0
    if (oldStock === 0 && typeof body.stock === 'number' && body.stock > 0 && updated) {
      const alerts = await StockAlert.find({ product: params.id }).lean() as unknown as { email: string; user?: string }[]
      if (alerts.length > 0) {
        const productUrl = `https://primepasal.com/products/${params.id}`
        await Promise.all(alerts.map(async (alert) => {
          await sendBackInStockEmail(alert.email, updated.title, productUrl).catch(console.error)
          if (alert.user) {
            await createNotification(
              alert.user.toString(),
              'back_in_stock',
              '📦 Back in Stock!',
              `"${updated.title}" is now available. Order before it sells out!`,
              `/products/${params.id}`
            ).catch(() => {})
          }
        }))
        await StockAlert.deleteMany({ product: params.id })
      }
    }

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
