export const dynamic = 'force-dynamic'
/**
 * Seeds realistic multi-item orders with deliberate co-purchase patterns.
 * This gives the Apriori algorithm meaningful training data.
 *
 * Patterns seeded:
 *   Electronics combos  — phone + headphones, laptop + headphones
 *   Fitness combos      — bike + shoes
 *   Home combos         — vacuum + kitchen
 *   Book + coffee combo — book + kitchen appliance
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import User from '@/models/User'
import { runAprioriMining } from '@/lib/apriori'
import { generateTrackingNumber } from '@/lib/utils'

const ADDRESS = {
  name: 'Test Customer',
  street: '123 Main St',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'US',
  phone: '+1-555-0100',
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    await connectDB()

    // Clear existing orders so rules start fresh
    await Order.deleteMany({})

    const customers = await User.find({ role: 'customer' }).lean()
    if (customers.length === 0) {
      return NextResponse.json({ success: false, error: 'No customers — run /api/seed first' }, { status: 400 })
    }

    const allProducts = await Product.find({ isApproved: true }).lean()
    if (allProducts.length < 4) {
      return NextResponse.json({ success: false, error: 'Need at least 4 products — run /api/seed first' }, { status: 400 })
    }

    // Build category-based product buckets
    const byTitle = (keyword: string) =>
      allProducts.find((p) => p.title.toLowerCase().includes(keyword.toLowerCase()))

    const phone = byTitle('Galaxy') || byTitle('iPhone') || allProducts[0]
    const laptop = byTitle('MacBook') || byTitle('laptop') || allProducts[1]
    const headphones = byTitle('Sony') || byTitle('headphone') || allProducts[2]
    const shoes = byTitle('Nike') || byTitle('shoe') || allProducts[3]
    const bike = byTitle('Peloton') || byTitle('bike') || allProducts[4] || allProducts[0]
    const vacuum = byTitle('Dyson') || byTitle('vacuum') || allProducts[5] || allProducts[1]
    const kitchen = byTitle('Instant Pot') || byTitle('kitchen') || allProducts[4] || allProducts[2]
    const book = byTitle('Atomic') || byTitle('book') || allProducts[6] || allProducts[3]
    const jacket = byTitle('North Face') || byTitle('jacket') || allProducts[9] || allProducts[4]
    const lego = byTitle('LEGO') || allProducts[10] || allProducts[5]

    /**
     * Co-purchase patterns with intended frequencies.
     * Each pattern = [productA, productB, ...] bought together, repeated `times`.
     * Strong signal → high frequency → high support & confidence → high lift.
     */
    const PATTERNS: { products: typeof phone[]; times: number }[] = [
      // Phone + headphones (very strong — 40 co-purchases)
      { products: [phone, headphones], times: 40 },
      // Laptop + headphones (strong — 35)
      { products: [laptop, headphones], times: 35 },
      // Phone + laptop (moderate — 20)
      { products: [phone, laptop], times: 20 },
      // Fitness: bike + shoes (strong — 30)
      { products: [bike, shoes], times: 30 },
      // Home: vacuum + kitchen (moderate — 22)
      { products: [vacuum, kitchen], times: 22 },
      // Book + kitchen (self-improvement buyers also cook) — 15
      { products: [book, kitchen], times: 15 },
      // Jacket + shoes (outdoor enthusiasts) — 18
      { products: [jacket, shoes], times: 18 },
      // LEGO + book (gift buyers) — 12
      { products: [lego, book], times: 12 },
      // Triple: phone + headphones + laptop (power users) — 15
      { products: [phone, headphones, laptop], times: 15 },
      // Triple: bike + shoes + jacket (athletes) — 12
      { products: [bike, shoes, jacket], times: 12 },
    ]

    const orders = []
    let orderSeq = 0
    const makeOrderNumber = () =>
      `AMZ-SEED-${Date.now().toString(36).toUpperCase()}-${(++orderSeq).toString(36).padStart(3, '0').toUpperCase()}`
    const makeInvoice = () => `INV-SEED-${Date.now().toString(36).toUpperCase()}-${orderSeq.toString(36).toUpperCase()}`

    for (const pattern of PATTERNS) {
      const validProducts = pattern.products.filter(Boolean)
      if (validProducts.length < 2) continue

      for (let i = 0; i < pattern.times; i++) {
        const customer = pick(customers)
        const items = validProducts.map((p) => ({
          product: p._id,
          title: p.title,
          image: p.images[0] || '',
          price: p.discountPrice || p.price,
          originalPrice: p.price,
          quantity: 1,
          seller: p.seller,
        }))

        const subtotal = items.reduce((s, item) => s + item.price, 0)
        orders.push({
          orderNumber: makeOrderNumber(),
          invoiceNumber: makeInvoice(),
          user: customer._id,
          items,
          shippingAddress: ADDRESS,
          paymentMethod: pick(['card', 'esewa', 'khalti', 'cod']),
          paymentStatus: 'paid',
          status: pick(['delivered', 'shipped', 'confirmed']),
          subtotal,
          shippingCost: 0,
          discount: 0,
          totalAmount: subtotal,
          trackingNumber: generateTrackingNumber(),
          giftOptions: { isGift: false, giftWrap: false },
        })
      }
    }

    // Add 50 random single-item orders (noise)
    for (let i = 0; i < 50; i++) {
      const product = pick(allProducts)
      const customer = pick(customers)
      const price = product.discountPrice || product.price
      orders.push({
        user: customer._id,
        items: [{
          product: product._id,
          title: product.title,
          image: product.images[0] || '',
          price,
          originalPrice: product.price,
          quantity: 1,
          seller: product.seller,
        }],
        shippingAddress: ADDRESS,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        status: 'delivered',
        subtotal: price,
        shippingCost: 0,
        discount: 0,
        totalAmount: price,
        trackingNumber: generateTrackingNumber(),
        orderNumber: makeOrderNumber(),
        invoiceNumber: makeInvoice(),
        giftOptions: { isGift: false, giftWrap: false },
      })
    }

    await Order.insertMany(orders)

    // ── Run Apriori immediately after seeding ──────────────────────────────
    const miningResult = await runAprioriMining({
      minSupport: 0.01,
      minConfidence: 0.05,
      minLift: 1.2,
      paidOnly: true,
    })

    return NextResponse.json({
      success: true,
      message: `${orders.length} orders seeded, Apriori mining completed`,
      data: {
        ordersCreated: orders.length,
        patterns: PATTERNS.length,
        mining: miningResult,
        topPatterns: [
          `Phone + Headphones (${PATTERNS[0].times}× co-purchases)`,
          `Laptop + Headphones (${PATTERNS[1].times}× co-purchases)`,
          `Bike + Shoes (${PATTERNS[4].times}× co-purchases)`,
        ],
      },
    })
  } catch (err) {
    console.error('Order seed error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
