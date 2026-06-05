export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/assignments
 * Returns all sub-orders with assignment info, supporting filters:
 *   ?seller=<id>  ?status=<status>  ?from=<date>  ?to=<date>  ?page=<n>
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const sellerId = searchParams.get('seller')
    const status   = searchParams.get('status')
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')
    const page     = parseInt(searchParams.get('page') || '1')
    const limit    = parseInt(searchParams.get('limit') || '20')
    const skip     = (page - 1) * limit

    // Build filter
    const filter: Record<string, unknown> = {}
    if (sellerId) filter.seller = sellerId
    if (status && status !== 'all') filter.status = status
    if (from || to) {
      filter.createdAt = {}
      if (from) (filter.createdAt as Record<string, Date>)['$gte'] = new Date(from)
      if (to)   (filter.createdAt as Record<string, Date>)['$lte'] = new Date(to + 'T23:59:59')
    }

    const [subOrders, total] = await Promise.all([
      SubOrder.find(filter)
        .populate('seller', 'name email')
        .populate({
          path: 'parentOrder',
          select: 'orderNumber user createdAt totalAmount shippingAddress',
          populate: { path: 'user', select: 'name email' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SubOrder.countDocuments(filter),
    ])

    return NextResponse.json({
      success: true,
      data:  subOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Admin assignments error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
