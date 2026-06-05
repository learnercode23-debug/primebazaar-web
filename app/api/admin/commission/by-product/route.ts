// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/commission/by-product?from=&to=&sort=commission&q=
 * Commission breakdown by product.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerLedger from '@/models/SellerLedger'
import Product from '@/models/Product'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    await connectDB()

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to   = searchParams.get('to')
    const sort = searchParams.get('sort') || 'commission'
    const q    = searchParams.get('q')?.trim()

    // Date filter on ledger entries
    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) dateFilter.createdAt['$gte'] = new Date(from)
      if (to)   dateFilter.createdAt['$lte'] = new Date(to + 'T23:59:59')
    }

    // Aggregate commission per product using itemTitle (since ledger doesn't store productId directly)
    // We join through order items via itemTitle + seller
    const results = await SellerLedger.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id:              '$itemTitle',
          seller:           { $first: '$seller' },
          totalCommission:  { $sum: '$commissionFee' },
          totalSalesVolume: { $sum: '$grossAmount' },
          avgRate:          { $avg: '$commissionRate' },
          orderCount:       { $addToSet: '$order' },
          itemCount:        { $sum: 1 },
        }
      },
      { $project: {
          productTitle:     '$_id',
          totalCommission:  1,
          totalSalesVolume: 1,
          avgRate:          { $round: ['$avgRate', 1] },
          orderCount:       { $size: '$orderCount' },
          itemCount:        1,
      }},
      { $sort: sort === 'volume' ? { totalSalesVolume: -1 } : sort === 'orders' ? { orderCount: -1 } : { totalCommission: -1 } },
      { $limit: 100 },
    ])

    // Optional title search filter
    const filtered = q
      ? results.filter(r => r.productTitle?.toLowerCase().includes(q.toLowerCase()))
      : results

    return NextResponse.json({ success: true, data: filtered })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
