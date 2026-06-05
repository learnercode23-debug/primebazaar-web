export const dynamic = 'force-dynamic'
/**
 * POST /api/seed/assignments
 * Seeds demo SellerInventory records so the assignment engine has
 * multi-seller products to work with.
 *
 * Creates 3 sellers (if they don't exist) and adds them as alternative
 * suppliers for the first 2 approved products at different prices.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import User from '@/models/User'
import Product from '@/models/Product'
import SellerInventory from '@/models/SellerInventory'
import AssignmentConfig from '@/models/AssignmentConfig'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    await connectDB()

    // ── 1. Ensure assignment config exists ──
    const existing = await AssignmentConfig.findOne()
    if (!existing) {
      await AssignmentConfig.create({ rule: 'lowest_price' })
    }

    // ── 2. Create 3 demo seller accounts ──
    const hash = await bcrypt.hash('seller123', 12)
    const sellerDefs = [
      { name: 'QuickMart Nepal',   email: 'quickmart@seller.com' },
      { name: 'ValueShop Ktm',     email: 'valueshop@seller.com' },
      { name: 'SwiftStore Nepal',  email: 'swiftstore@seller.com' },
    ]

    const sellers = []
    for (const def of sellerDefs) {
      const s = await User.findOneAndUpdate(
        { email: def.email },
        {
          $setOnInsert: {
            name:     def.name,
            email:    def.email,
            password: hash,
            role:     'seller',
            isActive: true,
          },
        },
        { upsert: true, new: true }
      )
      sellers.push(s)
    }

    // ── 3. Find first 3 approved products to add multi-seller inventory ──
    const products = await Product.find({ isApproved: true }).limit(3).lean()
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No approved products found. Approve some products first.',
      }, { status: 400 })
    }

    // ── 4. Create SellerInventory records ──
    // Each seller gets a slightly different price so the rules have something to compare
    const inventoryOps = []
    for (const product of products) {
      for (let i = 0; i < sellers.length; i++) {
        const seller  = sellers[i]
        const basePrice = product.discountPrice || product.price
        // Price multiplier: seller 0 cheapest, seller 2 most expensive
        const price   = Math.round(basePrice * (1 + i * 0.05))
        const stock   = 10 + i * 5    // varying stock levels

        inventoryOps.push(
          SellerInventory.findOneAndUpdate(
            { product: product._id, seller: seller._id },
            { $set: { price, stock, isActive: true } },
            { upsert: true, new: true }
          )
        )
      }
    }
    await Promise.all(inventoryOps)

    return NextResponse.json({
      success: true,
      message: `Seeded ${sellers.length} sellers × ${products.length} products = ${sellers.length * products.length} inventory records`,
      sellers: sellers.map((s) => ({ name: s.name, email: s.email })),
      products: products.map((p) => p.title),
    })
  } catch (err) {
    console.error('Seed assignments error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
