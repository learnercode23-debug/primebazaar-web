export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ReturnRequest from '@/models/ReturnRequest'
import Order from '@/models/Order'
import User from '@/models/User'
import { notifyReturnUpdate } from '@/lib/notifications'
import { sendReturnUpdate } from '@/lib/email'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { status, adminNotes, refundAmount } = await req.json()
    const returnReq = await ReturnRequest.findById(params.id)
    if (!returnReq) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    returnReq.status = status
    if (adminNotes) returnReq.adminNotes = adminNotes
    if (refundAmount !== undefined) returnReq.refundAmount = refundAmount
    if (status === 'completed' || status === 'approved' || status === 'rejected') {
      returnReq.resolvedAt = new Date()
    }
    await returnReq.save()

    // Update order status if completed
    if (status === 'completed') {
      await Order.findByIdAndUpdate(returnReq.order, { status: 'returned', paymentStatus: 'refunded' })
    }

    const customer = await User.findById(returnReq.user)
    if (customer?.email) {
      await sendReturnUpdate(customer.email, {
        returnNumber: returnReq.returnNumber,
        status,
        refundAmount: returnReq.refundAmount,
      })
    }

    await notifyReturnUpdate(returnReq.user.toString(), returnReq.returnNumber, status, returnReq._id.toString())

    return NextResponse.json({ success: true, data: returnReq })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
