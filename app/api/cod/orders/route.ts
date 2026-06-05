export const dynamic = 'force-dynamic'
/**
 * GET /api/cod/orders
 * Admin: returns all COD orders with collection/remittance status.
 * Filters: ?status=&collected=true|false&remittance=pending|remitted&page=
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page       = parseInt(searchParams.get('page') || '1')
    const limit      = parseInt(searchParams.get('limit') || '20')
    const skip       = (page - 1) * limit
    const status     = searchParams.get('status')
    const collected  = searchParams.get('collected')
    const remittance = searchParams.get('remittance')
    const search     = searchParams.get('search')

    const filter: Record<string, unknown> = { paymentMethod: 'cod' }
    if (status)     filter.status = status
    if (collected === 'true')  filter.codCollected = true
    if (collected === 'false') filter.codCollected = false
    if (remittance) filter.codRemittanceStatus = remittance
    if (search)     filter.orderNumber = { $regex: search, $options: 'i' }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ])

    // Summary stats for the dashboard header
    const [totalCOD, collected_, pending, remitted] = await Promise.all([
      Order.countDocuments({ paymentMethod: 'cod' }),
      Order.countDocuments({ paymentMethod: 'cod', codCollected: true }),
      Order.countDocuments({ paymentMethod: 'cod', codRemittanceStatus: 'pending', codCollected: true }),
      Order.countDocuments({ paymentMethod: 'cod', codRemittanceStatus: 'remitted' }),
    ])

    return NextResponse.json({
      success: true,
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: { totalCOD, collected: collected_, pending, remitted },
    })
  } catch (err) {
    console.error('COD orders error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
