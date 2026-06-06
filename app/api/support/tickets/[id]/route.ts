// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET   /api/support/tickets/:id  — get ticket + messages
 * PATCH /api/support/tickets/:id  — agent/admin: update status, priority, assign
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import { createNotification } from '@/lib/notifications'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const ticket = await SupportTicket.findById(params.id)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .populate('order', 'orderNumber totalAmount status createdAt')
      .lean()

    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })

    // Customers can only see their own ticket
    if (user.role === 'customer' && ticket.customer._id.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Get messages — hide internal notes from customers
    const msgFilter: Record<string, unknown> = { ticket: params.id }
    if (user.role === 'customer') msgFilter.isInternal = false

    const messages = await TicketMessage.find(msgFilter)
      .populate('sender', 'name role')
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json({ success: true, data: { ticket, messages } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const ticket = await SupportTicket.findById(params.id)
    if (!ticket) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const { status, priority, assignedAgent, csat } = await req.json()
    const now = new Date()

    // Customers can only submit CSAT on their own closed/resolved tickets
    if (user.role === 'customer') {
      if (ticket.customer.toString() !== user._id.toString()) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (csat) ticket.csat = csat
      await ticket.save()
      return NextResponse.json({ success: true, data: ticket })
    }

    // Agents/admins can update status, priority, assignment
    if (user.role !== 'agent' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Agent/Admin only' }, { status: 403 })
    }

    if (status)        ticket.status = status
    if (priority)      ticket.priority = priority
    if (assignedAgent) ticket.assignedAgent = assignedAgent
    if (csat)          ticket.csat = csat

    if (status === 'resolved' && !ticket.resolvedAt) ticket.resolvedAt = now
    if (status === 'closed'   && !ticket.closedAt)   ticket.closedAt   = now
    if (!ticket.firstResponseAt) ticket.firstResponseAt = now

    await ticket.save()

    await createNotification(
      ticket.customer.toString(),
      'admin_alert',
      `Ticket #${ticket.ticketNumber} Updated`,
      `Your ticket status is now: ${ticket.status.replace(/_/g, ' ')}`,
      `/support/tickets/${ticket._id}`
    ).catch(console.error)

    return NextResponse.json({ success: true, data: ticket })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
