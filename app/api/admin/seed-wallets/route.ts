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
import SellerWallet from '@/models/SellerWallet'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })

  await connectDB()

  // Find delivered orders that don't have ledger entries yet
  const deliveredOrders = await Order.find({ status: 'delivered' }).select('_id').limit(20).lean()

  if (deliveredOrders.length === 0) {
    // Mark some shipped/packed orders as delivered to generate ledger entries
    const ordersToDeliver = await Order.find({
      status: { $in: ['shipped', 'packed', 'processing', 'confirmed'] },
    }).limit(5)

    for (const order of ordersToDeliver) {
      order.status = 'delivered'
      order.deliveredAt = new Date()
      await order.save()
      await createLedgerEntry(order._id.toString())
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${ordersToDeliver.length} orders as delivered and created ledger entries`,
    })
  }

  // Create ledger entries for already-delivered orders
  let created = 0
  for (const order of deliveredOrders) {
    await createLedgerEntry(order._id.toString())
    created++
  }

  return NextResponse.json({
    success: true,
    message: `Created ledger entries for ${created} delivered orders`,
  })
}
