export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import ReturnRequest from '@/models/ReturnRequest'
import { createNotification } from '@/lib/notifications'
import { sendReturnUpdate } from '@/lib/email'
import User from '@/models/User'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (order.user.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ success: false, error: 'Only delivered orders can be returned' }, { status: 400 })
    }

    if (order.returnRequested) {
      return NextResponse.json({ success: false, error: 'Return already requested' }, { status: 409 })
    }

    const body = await req.json()
    const { items, reason, reasonDetail, photos, refundMethod } = body

    // Collapse duplicate rows for the same product so the refund can't be inflated
    // by listing the same item multiple times.
    const byProduct = new Map<string, { productId: string; quantity: number; reason?: string }>()
    for (const item of (items as Array<{ productId: string; quantity: number; reason?: string }>)) {
      const existing = byProduct.get(item.productId)
      const qty = Math.floor(Number(item.quantity) || 0)
      if (existing) existing.quantity += qty
      else byProduct.set(item.productId, { productId: item.productId, quantity: qty, reason: item.reason })
    }

    const returnItems = Array.from(byProduct.values()).map((item) => {
      const orderItem = order.items.find((i: { product: { toString: () => string } }) => i.product.toString() === item.productId)
      if (!orderItem) throw new Error('Item not found in order')
      // Clamp the total returned quantity for this product to what was actually ordered.
      const requested = item.quantity > 0 ? item.quantity : orderItem.quantity
      const quantity = Math.max(1, Math.min(requested, orderItem.quantity))
      return {
        product: orderItem.product,
        title: orderItem.title,
        quantity,
        price: orderItem.price,
        reason: item.reason || reason,
      }
    })

    const refundAmount = (returnItems as Array<{ price: number; quantity: number }>).reduce((s, i) => s + i.price * i.quantity, 0)

    const returnReq = await ReturnRequest.create({
      order: order._id,
      user: user._id,
      items: returnItems,
      reason,
      reasonDetail,
      photos: photos || [],
      refundMethod: refundMethod || 'original_payment',
      refundAmount,
    })

    order.returnRequested = true
    await order.save()

    const fullUser = await User.findById(user._id)
    if (fullUser?.email) {
      await sendReturnUpdate(fullUser.email, { returnNumber: returnReq.returnNumber, status: 'pending' })
    }

    await createNotification(
      user._id.toString(),
      'return_approved',
      'Return Request Submitted',
      `Return #${returnReq.returnNumber} is under review.`,
      `/orders/${order._id}`
    )

    return NextResponse.json({ success: true, data: returnReq }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
