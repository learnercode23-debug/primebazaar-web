export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import { emitAll, emitToUser } from '@/lib/socket-server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const order = await Order.findById(params.id).populate('user', 'name email').lean() as Record<string, unknown> | null

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const orderUser = order.user as { _id?: { toString: () => string } } | undefined
    const isOwner = orderUser && orderUser._id?.toString() === user._id.toString()
    if (!isOwner && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: order })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const body = await req.json()

    // Generate invoice number the moment an order is marked delivered
    if (body.status === 'delivered') {
      body.invoiceNumber = body.invoiceNumber || ('INV-' + Date.now().toString(36).toUpperCase())
      body.deliveredAt   = body.deliveredAt   || new Date()
    }

    const order = await Order.findByIdAndUpdate(params.id, body, { new: true })

    if (order) {
      const payload = { orderId: params.id, status: order.status, orderNumber: order.orderNumber }
      // Notify the customer whose order was updated
      emitToUser(order.user.toString(), 'order:updated', payload)
      // Notify admin dashboard (all admins are in the public room)
      emitAll('order:updated', payload)
    }

    return NextResponse.json({ success: true, data: order })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
