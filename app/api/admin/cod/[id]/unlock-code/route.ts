export const dynamic = 'force-dynamic'
/**
 * POST /api/admin/cod/:orderId/unlock-code
 * Admin unlocks a locked delivery code (after 3 wrong attempts).
 * Also optionally regenerates the code.
 * Body: { regenerate?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { regenerate = true } = await req.json().catch(() => ({ regenerate: true }))

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    order.deliveryCodeLocked   = false
    order.deliveryCodeAttempts = 0

    if (regenerate) {
      order.deliveryCode            = String(Math.floor(10000 + Math.random() * 90000))
      order.deliveryCodeGeneratedAt = new Date()
    }

    order.statusHistory.push({
      status:    order.status,
      timestamp: new Date(),
      note:      `Delivery code ${regenerate ? 'regenerated' : 'unlocked'} by admin`,
    })
    await order.save()

    return NextResponse.json({
      success: true,
      message: `Code ${regenerate ? 'regenerated' : 'unlocked'}`,
      code:    regenerate ? order.deliveryCode : undefined,
    })
  } catch (err) {
    console.error('Unlock code error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
