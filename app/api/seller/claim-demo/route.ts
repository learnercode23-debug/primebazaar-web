import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'

// Reassigns up to 6 seeded products to the requesting seller
// so they can immediately test the seller hub flow
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'seller') {
    return NextResponse.json({ success: false, error: 'Seller only' }, { status: 403 })
  }
  await connectDB()

  // Only claim if this seller currently has no products
  const existing = await Product.countDocuments({ seller: user._id })
  if (existing > 0) {
    return NextResponse.json({ success: false, error: 'You already have products' }, { status: 400 })
  }

  // Grab first 6 approved products and reassign to this seller
  const products = await Product.find({ isApproved: true }).limit(6).select('_id')
  const ids = products.map((p) => p._id)
  await Product.updateMany({ _id: { $in: ids } }, { $set: { seller: user._id } })

  return NextResponse.json({ success: true, claimed: ids.length })
}
