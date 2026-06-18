// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET   /api/messages/[id]  — get conversation + messages, mark as read
 * POST  /api/messages/[id]  — send message in existing conversation
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Conversation from '@/models/Conversation'
import DirectMessage from '@/models/DirectMessage'
import { createNotification } from '@/lib/notifications'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const convo = await Conversation.findById(params.id)
      .populate('customer', 'name avatar')
      .populate('seller',   'name avatar')
      .populate('product',  'title images price seller')
      .populate('order',    'orderNumber createdAt items')
      .lean()

    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const uid = user._id.toString()
    const isCustomer = convo.customer._id.toString() === uid
    const isSeller   = convo.seller._id.toString()   === uid
    if (!isCustomer && !isSeller && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as read
    if (isCustomer && convo.unreadByCustomer > 0) {
      await Conversation.findByIdAndUpdate(params.id, { unreadByCustomer: 0 })
      await DirectMessage.updateMany(
        { conversation: params.id, senderRole: 'seller', read: false },
        { read: true }
      )
    } else if (isSeller && convo.unreadBySeller > 0) {
      await Conversation.findByIdAndUpdate(params.id, { unreadBySeller: 0 })
      await DirectMessage.updateMany(
        { conversation: params.id, senderRole: 'customer', read: false },
        { read: true }
      )
    }

    const messages = await DirectMessage.find({ conversation: params.id })
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json({ success: true, data: { conversation: convo, messages } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const convo = await Conversation.findById(params.id)
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const uid = user._id.toString()
    const isCustomer = convo.customer.toString() === uid
    const isSeller   = convo.seller.toString()   === uid
    const isAdmin    = user.role === 'admin'
    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { body } = await req.json()
    if (!body?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // Admin replies appear as seller (support), and notifies the customer
    const senderRole = isCustomer ? 'customer' : 'seller'
    const notifyId   = isCustomer ? convo.seller.toString() : convo.customer.toString()
    const notifyPath = `/messages/${convo._id}`

    // Save message
    const msg = await DirectMessage.create({
      conversation: convo._id,
      sender:       user._id,
      senderRole,
      body:         body.trim(),
    })

    // Update conversation
    convo.lastMessage    = body.trim().slice(0, 100)
    convo.lastSenderRole = senderRole
    convo.lastMessageAt  = new Date()
    if (isCustomer) convo.unreadBySeller   += 1
    else            convo.unreadByCustomer += 1
    await convo.save()

    // Notify the other party
    await createNotification(
      notifyId,
      'admin_alert',
      isCustomer ? `Message from ${user.name}` : `Reply from seller ${user.name}`,
      body.trim().slice(0, 80),
      notifyPath
    ).catch(console.error)

    return NextResponse.json({ success: true, data: msg }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
