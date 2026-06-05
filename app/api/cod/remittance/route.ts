export const dynamic = 'force-dynamic'
/**
 * GET  /api/cod/remittance  → list all remittance batches
 * POST /api/cod/remittance  → create a new remittance (mark orders as remitted)
 *   Body: { orderIds: string[], totalAmount: number, notes? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import CashRemittance from '@/models/CashRemittance'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const remittances = await CashRemittance.find()
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ success: true, data: remittances })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { orderIds, totalAmount, notes } = await req.json()
    if (!orderIds?.length || !totalAmount) {
      return NextResponse.json({ success: false, error: 'orderIds and totalAmount required' }, { status: 400 })
    }

    // Mark all selected orders as remitted
    await Order.updateMany(
      { _id: { $in: orderIds }, paymentMethod: 'cod', codCollected: true },
      { $set: { codRemittanceStatus: 'remitted' } }
    )

    // Create remittance record (agent field optional — using admin as placeholder)
    const remittance = await CashRemittance.create({
      agent:       user._id,   // simplified: admin records it directly
      orders:      orderIds,
      totalAmount,
      handedAt:    new Date(),
      receivedBy:  user._id,
      notes:       notes || '',
      status:      'confirmed',
    })

    return NextResponse.json({ success: true, data: remittance }, { status: 201 })
  } catch (err) {
    console.error('COD remittance error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
