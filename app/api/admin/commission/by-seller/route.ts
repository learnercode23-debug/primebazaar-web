// @ts-nocheck
export const dynamic = 'force-dynamic'
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

    const results = await SellerLedger.aggregate([
      { $match: dateFilter },
      { $group: {
          _id:              '$seller',
          totalCommission:  { $sum: '$commissionFee' },
          totalSalesVolume: { $sum: '$grossAmount' },
          avgRate:          { $avg: '$commissionRate' },
          orderCount:       { $addToSet: '$order' },
          itemCount:        { $sum: 1 },
      }},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'sellerInfo' }},
      { $unwind: { path: '$sellerInfo', preserveNullAndEmptyArrays: true }},
      { $project: {
          sellerName:       { $ifNull: ['$sellerInfo.name', 'Unknown'] },
          sellerEmail:      '$sellerInfo.email',
          totalCommission:  1,
          totalSalesVolume: 1,
          avgRate:          { $round: ['$avgRate', 1] },
          orderCount:       { $size: '$orderCount' },
          itemCount:        1,
      }},
      { $sort: { totalCommission: -1 }},
    ])

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
