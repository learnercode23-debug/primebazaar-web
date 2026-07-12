export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ReturnRequest from '@/models/ReturnRequest'
import Order from '@/models/Order'
import Product from '@/models/Product'
import User from '@/models/User'
import SellerLedger from '@/models/SellerLedger'
import SellerWallet from '@/models/SellerWallet'
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

    // On completion, actually reverse the money & inventory — otherwise the platform
    // refunds the buyer AND still pays the seller for the returned goods.
    if (status === 'completed') {
      await Order.findByIdAndUpdate(returnReq.order, { status: 'returned', paymentStatus: 'refunded' })

      // 1. Restore stock for each returned item
      const items = (returnReq.items || []) as Array<{ product: unknown; quantity: number }>
      for (const it of items) {
        if (it.product && it.quantity > 0) {
          await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } }).catch(() => {})
        }
      }

      // 2. Claw back seller earnings for this order: void not-yet-paid ledger entries
      //    and remove their value from the seller's wallet balances.
      const ledgerEntries = await SellerLedger.find({
        order: returnReq.order,
        status: { $in: ['pending', 'available'] },
      })
      for (const entry of ledgerEntries) {
        const wasAvailable = entry.status === 'available'
        entry.status = 'refunded'
        await entry.save().catch(() => {})
        await SellerWallet.findOneAndUpdate(
          { seller: entry.seller },
          {
            $inc: wasAvailable
              ? { availableBalance: -entry.netEarning, totalEarned: -entry.netEarning }
              : { pendingBalance: -entry.netEarning, totalEarned: -entry.netEarning },
          }
        ).catch(() => {})
      }

      // 3. Refund the customer as store credit (the platform's refund mechanism)
      if (returnReq.refundAmount > 0) {
        await User.findByIdAndUpdate(returnReq.user, { $inc: { storeCredit: returnReq.refundAmount } }).catch(() => {})
      }
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
