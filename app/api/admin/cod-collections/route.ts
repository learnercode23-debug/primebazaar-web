export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/cod-collections
 * Returns all COD orders where cash has been collected.
 * Grouped summary per delivery agent + full order list.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    // All delivered COD orders with cash collected
    const orders = await Order.find({
      paymentMethod: 'cod',
      codCollected:  true,
    })
      .populate('user',                   'name email phone')
      .populate('deliveryCodeCollectedBy','name email')
      .sort({ codCollectedAt: -1 })
      .limit(200)
      .lean()

    // Group totals by delivery agent
    const agentMap = new Map<string, { name: string; email: string; count: number; total: number }>()
    for (const o of orders) {
      const agent = o.deliveryCodeCollectedBy as { _id: string; name: string; email: string } | null
      const key = agent?._id?.toString() || 'unassigned'
      const existing = agentMap.get(key)
      if (existing) {
        existing.count++
        existing.total += o.codCollectedAmount || o.totalAmount
      } else {
        agentMap.set(key, {
          name:  agent?.name  || 'Unassigned',
          email: agent?.email || '—',
          count: 1,
          total: o.codCollectedAmount || o.totalAmount,
        })
      }
    }

    const agentSummary = Array.from(agentMap.entries()).map(([id, data]) => ({ id, ...data }))

    // Platform totals
    const totalCollected = orders.reduce((s, o) => s + (o.codCollectedAmount || o.totalAmount), 0)

    return NextResponse.json({
      success: true,
      data: { orders, agentSummary, totalCollected },
    })
  } catch (err) {
    console.error('COD collections error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
