// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/commission/summary?from=&to=
 * Returns total commission, pending/earned breakdown, sales volume.
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
    const from = searchParams.get('from')
    const to   = searchParams.get('to')

    const dateFilter: Record<string, unknown> = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) dateFilter.createdAt['$gte'] = new Date(from)
      if (to)   dateFilter.createdAt['$lte'] = new Date(to + 'T23:59:59')
    }

    const [summary] = await SellerLedger.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id:              null,
          totalCommission:  { $sum: '$commissionFee' },
          totalSalesVolume: { $sum: '$grossAmount' },
          pendingCommission:{ $sum: { $cond: [{ $eq: ['$status','pending'] }, '$commissionFee', 0] } },
          earnedCommission: { $sum: { $cond: [{ $eq: ['$status','available'] },'$commissionFee',0] } },
          paidCommission:   { $sum: { $cond: [{ $eq: ['$status','paid'] }, '$commissionFee', 0] } },
          orderCount:       { $addToSet: '$order' },
          itemCount:        { $sum: 1 },
        }
      },
      { $project: {
          totalCommission:  1,
          totalSalesVolume: 1,
          pendingCommission:1,
          earnedCommission: 1,
          paidCommission:   1,
          orderCount: { $size: '$orderCount' },
          itemCount:  1,
      }}
    ])

    return NextResponse.json({ success: true, data: summary || {
      totalCommission: 0, totalSalesVolume: 0, pendingCommission: 0,
      earnedCommission: 0, paidCommission: 0, orderCount: 0, itemCount: 0,
    }})
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
