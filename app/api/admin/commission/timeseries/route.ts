// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/commission/timeseries?from=&to=&interval=day|week|month
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerLedger from '@/models/SellerLedger'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    await connectDB()

    const { searchParams } = new URL(req.url)
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')
    const interval = searchParams.get('interval') || 'day'

    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) dateFilter.createdAt['$gte'] = new Date(from)
      if (to)   dateFilter.createdAt['$lte'] = new Date(to + 'T23:59:59')
    }

    // Determine date format string for grouping
    const fmt = interval === 'month' ? '%Y-%m' : interval === 'week' ? '%G-W%V' : '%Y-%m-%d'

    const series = await SellerLedger.aggregate([
      { $match: dateFilter },
      { $group: {
          _id:             { $dateToString: { format: fmt, date: '$createdAt' } },
          commission:      { $sum: '$commissionFee' },
          salesVolume:     { $sum: '$grossAmount' },
          orderCount:      { $addToSet: '$order' },
      }},
      { $project: {
          date:        '$_id',
          commission:  1,
          salesVolume: 1,
          orderCount:  { $size: '$orderCount' },
      }},
      { $sort: { date: 1 } },
    ])

    return NextResponse.json({ success: true, data: series })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
