// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET  /api/support/tickets  — customer's own tickets
 * POST /api/support/tickets  — create new ticket
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import { createNotification } from '@/lib/notifications'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    // Admin/agent can see all tickets; customers only see their own
    const filter: Record<string, unknown> = (user.role === 'admin' || user.role === 'agent')
      ? {}
      : { customer: user._id }
    if (status) filter.status = status

    const { searchParams: sp } = new URL(req.url)
    const priority = sp.get('priority')
    const category = sp.get('category')
    const q        = sp.get('q')
    if (priority) filter.priority = priority
    if (category) filter.category = category
    if (q) filter.$or = [
      { subject:      { $regex: q, $options: 'i' } },
      { ticketNumber: { $regex: q, $options: 'i' } },
    ]

    const tickets = await SupportTicket.find(filter)
      .populate('customer',      'name email')
      .populate('assignedAgent', 'name')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, data: tickets })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const { category, subject, description, orderId } = await req.json()
    if (!category || !subject?.trim() || !description?.trim()) {
      return NextResponse.json({ success: false, error: 'category, subject, and description are required' }, { status: 400 })
    }

    const ticket = await SupportTicket.create({
      customer:    user._id,
      category,
      subject:     subject.trim().slice(0, 200),
      description: description.trim().slice(0, 5000),
      order:       orderId || undefined,
      status:      'open',
      priority:    'medium',
    })

    // First message from customer = the description
    await TicketMessage.create({
      ticket:     ticket._id,
      sender:     user._id,
      senderRole: 'customer',
      body:       description.trim(),
    })

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id').lean()
    for (const admin of admins) {
      await createNotification(
        admin._id.toString(),
        'admin_alert',
        'New Support Ticket',
        `#${ticket.ticketNumber}: ${subject}`,
        `/support/tickets/${ticket._id}`
      ).catch(console.error)
    }

    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
