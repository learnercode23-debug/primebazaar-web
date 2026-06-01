import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const [orders, totalUsers, totalSellers, totalProducts] = await Promise.all([
      Order.find({ paymentStatus: 'paid' }).lean(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'seller' }),
      Product.countDocuments(),
    ])

    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0)

    const revenueByMonth: Record<string, number> = {}
    for (const order of orders) {
      const month = new Date(order.createdAt).toISOString().slice(0, 7)
      revenueByMonth[month] = (revenueByMonth[month] || 0) + order.totalAmount
    }

    const monthlyRevenue = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }))

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        totalUsers,
        totalSellers,
        totalProducts,
        recentOrders,
        monthlyRevenue,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
