export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/assignments/:subOrderId/logs
 * Returns full assignment history for a sub-order.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import AssignmentLog from '@/models/AssignmentLog'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const logs = await AssignmentLog.find({ subOrder: params.id })
      .populate('fromSeller', 'name')
      .populate('toSeller',   'name')
      .populate('performedBy','name')
      .sort({ timestamp: 1 })
      .lean()

    return NextResponse.json({ success: true, data: logs })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
