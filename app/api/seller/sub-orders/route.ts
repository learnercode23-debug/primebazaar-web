export const dynamic = 'force-dynamic'
/**
 * GET /api/seller/sub-orders
 * Returns the logged-in seller's sub-orders with optional status filter.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit  = parseInt(searchParams.get('limit') || '50')

    const query: Record<string, unknown> = { seller: user._id }
    if (status && status !== 'all') query.status = status

    const subOrders = await SubOrder.find(query)
      .populate('parentOrder', 'orderNumber user shippingAddress paymentMethod createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Tab counts
    const allSubs = await SubOrder.find({ seller: user._id }).select('status').lean()
    const counts = {
      confirmed:  allSubs.filter((s) => s.status === 'confirmed').length,
      processing: allSubs.filter((s) => s.status === 'processing').length,
      packed:     allSubs.filter((s) => s.status === 'packed').length,
      shipped:    allSubs.filter((s) => s.status === 'shipped').length,
      delivered:  allSubs.filter((s) => s.status === 'delivered').length,
      cancelled:  allSubs.filter((s) => s.status === 'cancelled').length,
      total:      allSubs.length,
    }

    return NextResponse.json({ success: true, data: subOrders, counts })
  } catch (err) {
    console.error('Sub-orders error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
