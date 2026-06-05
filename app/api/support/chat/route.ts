// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/support/chat — start a new chat session (bot mode)
 * GET  /api/support/chat — get customer's active chat
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ChatSession from '@/models/ChatSession'
import HelpArticle from '@/models/HelpArticle'
import Order from '@/models/Order'

// Simple bot: find relevant articles + recent order status
async function botReply(customerId: string, userMessage: string): Promise<string> {
  const lower = userMessage.toLowerCase()

  // Order status intent
  if (lower.includes('order') || lower.includes('track') || lower.includes('shipping')) {
    const recentOrder = await Order.findOne({ user: customerId })
      .sort({ createdAt: -1 })
      .select('orderNumber status totalAmount createdAt')
      .lean()
    if (recentOrder) {
      return `Your most recent order #${recentOrder.orderNumber} is currently **${recentOrder.status}** (Rs.${recentOrder.totalAmount?.toLocaleString()}). Would you like more help with this order, or shall I connect you to a support agent?`
    }
  }

  // Return/refund intent
  if (lower.includes('return') || lower.includes('refund')) {
    return `For returns and refunds, you can go to **My Orders → Return/Refund** to request a return. Returns are accepted within 30 days of delivery. Would you like me to connect you to an agent for help with a specific return?`
  }

  // Payment intent
  if (lower.includes('payment') || lower.includes('pay') || lower.includes('charge')) {
    return `For payment issues, please check your payment method and try again. If money was deducted but order wasn't placed, it will be refunded within 5-7 business days. Would you like to speak with an agent?`
  }

  // Cancel intent
  if (lower.includes('cancel')) {
    return `You can cancel an order from **My Orders** if it hasn't been shipped yet. Once shipped, you'll need to request a return after delivery. Would you like help cancelling a specific order?`
  }

  // Search articles
  const articles = await HelpArticle.find({ $text: { $search: userMessage }, isPublished: true })
    .select('title').limit(3).lean()

  if (articles.length > 0) {
    const list = articles.map(a => `• ${a.title}`).join('\n')
    return `I found some articles that might help:\n${list}\n\nWould you like me to connect you with a support agent for more help?`
  }

  return `Thank you for contacting support. I'm here to help! Could you give me more details about your issue? Or I can connect you to a human support agent right away — just say **"agent"** or **"human"**.`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const session = await ChatSession.findOne({
      customer: user._id,
      status:   { $in: ['active', 'waiting_agent', 'with_agent'] },
    }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ success: true, data: session })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 })

    // Get or create active session
    let session = await ChatSession.findOne({
      customer: user._id,
      status:   { $in: ['active', 'waiting_agent', 'with_agent'] },
    })

    const botResponse = await botReply(user._id.toString(), message)

    if (!session) {
      session = await ChatSession.create({
        customer: user._id,
        mode:     'bot',
        status:   'active',
        messages: [
          { sender: user._id, senderRole: 'customer', body: message, createdAt: new Date() },
          { sender: user._id, senderRole: 'bot',      body: botResponse, createdAt: new Date() },
        ],
      })
    } else {
      session.messages.push(
        { sender: user._id, senderRole: 'customer', body: message,     createdAt: new Date() },
        { sender: user._id, senderRole: 'bot',      body: botResponse, createdAt: new Date() },
      )
      await session.save()
    }

    return NextResponse.json({ success: true, data: session, botReply: botResponse })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
