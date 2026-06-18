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
import Order from '@/models/Order'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    let filter: Record<string, unknown>
    if (user.role === 'admin') {
      filter = { status: 'active' }
    } else if (user.role === 'seller') {
      filter = { seller: user._id, status: 'active' }
    } else {
      filter = { customer: user._id, status: 'active' }
    }

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

    let { sellerId, productId, message, orderId } = await req.json()

    // When messaging about an order, resolve the seller (and a thumbnail product)
    // from the order itself — the customer only needs to send the orderId.
    let orderRef: string | undefined
    if (orderId) {
      const order = await Order.findById(orderId).select('user items orderNumber')
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      if (order.user.toString() !== user._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const firstItem = order.items?.[0]
      if (!firstItem?.seller) return NextResponse.json({ error: 'No seller on this order' }, { status: 400 })
      sellerId = firstItem.seller.toString()
      orderRef = order._id.toString()
    }

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId or orderId required' }, { status: 400 })
    }
    if (user._id.toString() === sellerId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    // Find or create the conversation (scoped by order, else by product)
    const query: Record<string, unknown> = { customer: user._id, seller: sellerId }
    if (orderRef) query.order = orderRef
    else if (productId) query.product = productId

    let convo = await Conversation.findOne(query)
    const isNew = !convo
    if (!convo) {
      convo = await Conversation.create({
        customer:       user._id,
        seller:         sellerId,
        product:        orderRef ? undefined : (productId || undefined),
        order:          orderRef || undefined,
        lastMessage:    message?.trim().slice(0, 100) || 'Started a conversation',
        lastSenderRole: 'customer',
        unreadBySeller: message?.trim() ? 1 : 0,
      })
      // Welcome line so the thread is never empty
      await DirectMessage.create({
        conversation: convo._id,
        sender:       null,
        senderRole:   'bot',
        body:         orderRef
          ? `✓ You're now chatting with the seller about your order. Ask anything — delivery, returns, or product details.`
          : `✓ Your message has been sent to the seller. You'll get a notification when they reply.`,
      })
    }

    // Save the customer's message if one was provided
    if (message?.trim()) {
      if (!isNew) {
        convo.lastMessage    = message.trim().slice(0, 100)
        convo.lastSenderRole = 'customer'
        convo.unreadBySeller += 1
        convo.lastMessageAt   = new Date()
        await convo.save()
      }
      await DirectMessage.create({
        conversation: convo._id,
        sender:       user._id,
        senderRole:   'customer',
        body:         message.trim(),
      })
      await createNotification(
        sellerId,
        'admin_alert',
        'New message from customer',
        `${user.name}: ${message.trim().slice(0, 60)}`,
        `/messages/${convo._id}`
      ).catch(console.error)
    }

    return NextResponse.json({ success: true, data: { conversationId: convo._id } }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
