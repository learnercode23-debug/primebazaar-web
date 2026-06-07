// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/support/chat/escalate
 * Escalates current bot chat to a human agent.
 * Creates a linked support ticket and notifies admins.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ChatSession from '@/models/ChatSession'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import User from '@/models/User'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const session = await ChatSession.findOne({
      customer: user._id,
      status:   { $in: ['active', 'waiting_agent'] },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: 'No active chat session' }, { status: 404 })
    }

    // Create a support ticket from the chat transcript
    const transcript = session.messages
      .map(m => `[${m.senderRole.toUpperCase()}]: ${m.body}`)
      .join('\n')

    const ticket = await SupportTicket.create({
      customer:    user._id,
      category:    'other',
      subject:     'Escalated from live chat',
      description: `Chat escalated to human agent.\n\n--- Chat Transcript ---\n${transcript}`,
      status:      'open',
      priority:    'high',
    })

    // First ticket message = transcript
    await TicketMessage.create({
      ticket:     ticket._id,
      sender:     user._id,
      senderRole: 'bot',
      body:       `Chat transcript:\n${transcript}`,
    })

    // Update session
    session.status = 'waiting_agent'
    session.mode   = 'human'
    session.ticket = ticket._id
    session.messages.push({
      sender:     user._id,
      senderRole: 'bot',
      body:       "I'm connecting you to a support agent now. Please hold — an agent will be with you shortly.",
      createdAt:  new Date(),
    })
    await session.save()

    // Notify admins
    const admins = await User.find({ role: 'admin' }).select('_id').lean()
    for (const admin of admins) {
      await createNotification(
        admin._id.toString(),
        'admin_alert',
        'Chat Escalated — Agent Requested',
        `Customer needs human support. Ticket #${ticket.ticketNumber}`,
        `/support/tickets/${ticket._id}`
      ).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Connecting you to a human agent...',
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
