// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/commission/export?from=&to=
 * Returns commission data as a downloadable CSV file.
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

    const records = await SellerLedger.find(dateFilter)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()

    // Build CSV
    const header = ['Date', 'Order Number', 'Product', 'Seller', 'Gross Amount', 'Commission Rate (%)', 'Commission (Rs.)', 'Status']
    const rows   = records.map(r => [
      new Date(r.createdAt).toLocaleDateString(),
      r.orderNumber || '',
      r.itemTitle || '',
      r.seller?.name || '',
      r.grossAmount?.toFixed(2) || '0',
      r.commissionRate?.toFixed(1) || '0',
      r.commissionFee?.toFixed(2) || '0',
      r.status || '',
    ])

    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="commission-report-${new Date().toISOString().slice(0,10)}.csv"`,
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
