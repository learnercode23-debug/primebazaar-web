// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/support/tickets/:id/messages — reply to a ticket
 * Body: { body, isInternal? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import { createNotification } from '@/lib/notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const ticket = await SupportTicket.findById(params.id)
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })

    // Customers can only reply to their own ticket
    if (user.role === 'customer' && ticket.customer.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { body, isInternal = false } = await req.json()
    if (!body?.trim()) return NextResponse.json({ success: false, error: 'Message body required' }, { status: 400 })

    // Customers cannot send internal notes
    const internal = user.role !== 'customer' && isInternal

    const message = await TicketMessage.create({
      ticket:     ticket._id,
      sender:     user._id,
      senderRole: user.role === 'customer' ? 'customer' : (user.role === 'admin' ? 'admin' : 'agent'),
      body:       body.trim().slice(0, 10000),
      isInternal: internal,
    })

    // Update ticket status
    if (user.role === 'customer') {
      if (ticket.status === 'waiting_customer') ticket.status = 'in_progress'
    } else {
      ticket.status = 'waiting_customer'
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date()
    }
    await ticket.save()

    // Notify the other party
    const notifyId = user.role === 'customer'
      ? (ticket.assignedAgent?.toString() || '')
      : ticket.customer.toString()

    if (notifyId && !internal) {
      await createNotification(
        notifyId,
        'admin_alert',
        `New reply on #${ticket.ticketNumber}`,
        body.trim().slice(0, 100),
        `/support/tickets/${ticket._id}`
      ).catch(console.error)
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
