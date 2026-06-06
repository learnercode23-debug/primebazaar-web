// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET  /api/messages  — list conversations for logged-in user
 * POST /api/messages  — start or get existing conversation (customer → seller about a product)
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Conversation from '@/models/Conversation'
import DirectMessage from '@/models/DirectMessage'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const filter = user.role === 'seller' || user.role === 'admin'
      ? { seller: user._id, status: 'active' }
      : { customer: user._id, status: 'active' }

    const conversations = await Conversation.find(filter)
      .populate('customer', 'name avatar')
      .populate('seller',   'name avatar')
      .populate('product',  'title images')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ success: true, data: conversations })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const { sellerId, productId, message } = await req.json()
    if (!sellerId || !message?.trim()) {
      return NextResponse.json({ error: 'sellerId and message required' }, { status: 400 })
    }
    if (user._id.toString() === sellerId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    // Find or create conversation
    const query: Record<string, unknown> = { customer: user._id, seller: sellerId }
    if (productId) query.product = productId

    let convo = await Conversation.findOne(query)
    if (!convo) {
      convo = await Conversation.create({
        customer:       user._id,
        seller:         sellerId,
        product:        productId || undefined,
        lastMessage:    message.trim().slice(0, 100),
        lastSenderRole: 'customer',
        unreadBySeller: 1,
      })
    } else {
      convo.lastMessage    = message.trim().slice(0, 100)
      convo.lastSenderRole = 'customer'
      convo.unreadBySeller += 1
      convo.lastMessageAt   = new Date()
      await convo.save()
    }

    // Save message
    await DirectMessage.create({
      conversation: convo._id,
      sender:       user._id,
      senderRole:   'customer',
      body:         message.trim(),
    })

    // Auto-bot reply (immediate confirmation to customer)
    await DirectMessage.create({
      conversation: convo._id,
      sender:       null,
      senderRole:   'bot',
      body:         `✓ Your message has been sent to the seller. You'll get a notification when they reply. Meanwhile, you can also [open a support ticket](/support) if this is urgent.`,
    })

    // Notify seller
    await createNotification(
      sellerId,
      'New message from customer',
      `${user.name}: ${message.trim().slice(0, 60)}`,
      'info',
      `/messages/${convo._id}`
    ).catch(console.error)

    return NextResponse.json({ success: true, data: { conversationId: convo._id } }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
