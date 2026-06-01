/**
 * GET /api/seller/orders
 * Returns orders that contain at least one item sold by this seller.
 * Supports: ?status=confirmed&search=AMZ-XXX&dateFrom=2024-01-01&dateTo=2024-12-31
 */
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
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query: must include this seller's items
    const query: Record<string, unknown> = { 'items.seller': user._id }

    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {}
      if (dateFrom) dateQuery.$gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        dateQuery.$lte = end
      }
      query.createdAt = dateQuery
    }

    let orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean()

    // Apply text search (order number, product title, customer name)
    if (search) {
      const lc = search.toLowerCase()
      orders = orders.filter((order) => {
        const orderUser = order.user as { name?: string; email?: string }
        return (
          order.orderNumber?.toLowerCase().includes(lc) ||
          order.items.some((i: { title: string }) => i.title.toLowerCase().includes(lc)) ||
          orderUser?.name?.toLowerCase().includes(lc) ||
          orderUser?.email?.toLowerCase().includes(lc)
        )
      })
    }

    // Filter items to only this seller's items, and attach stock info for 'confirmed' orders
    type SellerItem = { seller: { toString: () => string }; product: { toString: () => string } }
    const filtered = await Promise.all(
      orders.map(async (order) => {
        const myItems = (order.items as SellerItem[]).filter(
          (item) => item.seller.toString() === user._id.toString()
        )

        // For new (confirmed) orders, check current stock so UI can show warnings
        let stockWarnings: Record<string, number> = {}
        if (order.status === 'confirmed') {
          const stockChecks = await Promise.all(
            myItems.map(async (item) => {
              const product = await Product.findById(item.product).select('stock').lean() as { stock: number } | null
              return { productId: item.product.toString(), stock: product?.stock ?? 0 }
            })
          )
          for (const { productId, stock } of stockChecks) {
            stockWarnings[productId] = stock
          }
        }

        return { ...order, items: myItems, stockWarnings }
      })
    )

    // Tab counts — always return counts across all statuses for badge display
    const allOrders = await Order.find({ 'items.seller': user._id }).select('status').lean()
    const counts = {
      all: allOrders.length,
      new: allOrders.filter((o) => o.status === 'confirmed').length,
      accepted: allOrders.filter((o) => o.status === 'processing').length,
      packed: allOrders.filter((o) => o.status === 'packed').length,
      shipped: allOrders.filter((o) => o.status === 'shipped').length,
      delivered: allOrders.filter((o) => o.status === 'delivered').length,
      cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
    }

    return NextResponse.json({ success: true, data: filtered, counts })
  } catch (err) {
    console.error('Seller orders error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
