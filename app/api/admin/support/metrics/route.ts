export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/support/metrics — response time, volume, CSAT
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const [
      totalTickets, openTickets, resolvedTickets,
      csatData, avgResponseData
    ] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress', 'waiting_customer'] } }),
      SupportTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      SupportTicket.aggregate([
        { $match: { csat: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$csat' }, count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $match: { firstResponseAt: { $exists: true } } },
        { $project: { responseMs: { $subtract: ['$firstResponseAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$responseMs' } } }
      ])
    ])

    const avgCsat         = csatData[0]?.avg?.toFixed(1) || 'N/A'
    const csatCount       = csatData[0]?.count || 0
    const avgResponseHrs  = avgResponseData[0]
      ? Math.round(avgResponseData[0].avgMs / 3600000 * 10) / 10
      : null

    // Volume by category
    const byCategory = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Last 7 days volume
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)
    const recentVolume = await SupportTicket.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalTickets, openTickets, resolvedTickets,
        avgCsat, csatCount,
        avgResponseHrs,
        byCategory,
        recentVolume,
        resolutionRate: totalTickets > 0 ? Math.round(resolvedTickets / totalTickets * 100) : 0,
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
