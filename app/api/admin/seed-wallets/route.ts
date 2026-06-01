/**
 * POST /api/admin/seed-wallets
 * Creates demo wallet/ledger data for testing the payout system.
 * Admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { createLedgerEntry } from '@/lib/settlement'
import Order from '@/models/Order'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })

  await connectDB()

  // Find delivered orders
  const deliveredOrders = await Order.find({ status: 'delivered' }).select('_id').limit(20)

  if (deliveredOrders.length === 0) {
    // Mark some orders as delivered to generate ledger entries
    const ordersToDeliver = await Order.find({
      status: { $in: ['shipped', 'packed', 'processing', 'confirmed'] },
    }).limit(5)

    for (const order of ordersToDeliver) {
      order.status = 'delivered'
      order.deliveredAt = new Date()
      await order.save()
      await createLedgerEntry((order._id as { toString(): string }).toString())
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${ordersToDeliver.length} orders as delivered and created ledger entries`,
    })
  }

  let created = 0
  for (const order of deliveredOrders) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createLedgerEntry((order as any)._id.toString())
    created++
  }

  return NextResponse.json({
    success: true,
    message: `Created ledger entries for ${created} delivered orders`,
  })
}
