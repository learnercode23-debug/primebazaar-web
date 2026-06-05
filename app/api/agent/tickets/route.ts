export const dynamic = 'force-dynamic'
/**
 * GET /api/agent/tickets — all tickets (agent/admin view)
 * Filters: status, priority, category, assignedToMe
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'admin' && user.role !== 'seller')) {
      return NextResponse.json({ success: false, error: 'Agent/Admin only' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const status       = searchParams.get('status')
    const priority     = searchParams.get('priority')
    const category     = searchParams.get('category')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'
    const page         = parseInt(searchParams.get('page') || '1')
    const limit        = 20
    const skip         = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (status)       filter.status   = status
    if (priority)     filter.priority = priority
    if (category)     filter.category = category
    if (assignedToMe) filter.assignedAgent = user._id

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('customer',      'name email')
        .populate('assignedAgent', 'name')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip).limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ])

    // Count by status for tabs
    const [openCount, inProgressCount, waitingCount, resolvedCount] = await Promise.all([
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'waiting_customer' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
    ])

    return NextResponse.json({
      success: true,
      data: tickets, total, page,
      totalPages: Math.ceil(total / limit),
      counts: { open: openCount, in_progress: inProgressCount, waiting: waitingCount, resolved: resolvedCount },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
