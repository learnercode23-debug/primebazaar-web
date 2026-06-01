import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const [orders, products] = await Promise.all([
      Order.find({ 'items.seller': user._id, paymentStatus: 'paid' }).lean(),
      Product.find({ seller: user._id }).lean(),
    ])

    let totalRevenue = 0
    const revenueByMonth: Record<string, number> = {}

    type OrderItem = { seller: { toString: () => string }; price: number; quantity: number }
    for (const order of orders) {
      const items = (order.items as OrderItem[])
      const sellerItems = items.filter((i) => i.seller.toString() === user._id.toString())
      const revenue = sellerItems.reduce((s, i) => s + i.price * i.quantity, 0)
      totalRevenue += revenue

      const month = new Date(order.createdAt).toISOString().slice(0, 7)
      revenueByMonth[month] = (revenueByMonth[month] || 0) + revenue
    }

    const monthlyRevenue = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }))

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        recentOrders: orders.slice(-5),
        monthlyRevenue,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
