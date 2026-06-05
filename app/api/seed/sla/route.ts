export const dynamic = 'force-dynamic'
/**
 * POST /api/seed/sla
 * Artificially back-dates the acceptDeadline of recent sub-orders
 * so the SLA checker has something to act on immediately.
 * Also ensures SLAConfig and demo SellerInventory exist.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'
import SLAConfig from '@/models/SLAConfig'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    await connectDB()

    // Ensure SLA config exists
    const cfg = await SLAConfig.findOne()
    if (!cfg) await SLAConfig.create({ acceptHours: 24, shipDays: 3, onAcceptBreach: 'reassign', onShipBreach: 'flag' })

    // Find the 3 most recent confirmed sub-orders and backdate their deadlines
    const subs = await SubOrder.find({ status: 'confirmed' }).sort({ createdAt: -1 }).limit(3)
    if (subs.length === 0) {
      return NextResponse.json({ success: false, error: 'No confirmed sub-orders found. Place a test order first.' }, { status: 400 })
    }

    const past1h   = new Date(Date.now() - 1  * 3600 * 1000)  // breached 1h ago
    const past30m  = new Date(Date.now() - 30 * 60   * 1000)  // breached 30m ago
    const future5m = new Date(Date.now() + 5  * 60   * 1000)  // at risk — only 5m left

    const scenarios = [
      { acceptDeadline: past1h,   slaStatus: 'ok', label: 'Accept breached (1h ago)' },
      { acceptDeadline: past30m,  slaStatus: 'ok', label: 'Accept breached (30m ago)' },
      { acceptDeadline: future5m, slaStatus: 'ok', label: 'At risk (5m left)' },
    ]

    const updated = []
    for (let i = 0; i < subs.length; i++) {
      const scenario = scenarios[i % scenarios.length]
      subs[i].acceptDeadline  = scenario.acceptDeadline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(subs[i] as any).slaStatus       = scenario.slaStatus
      subs[i].autoActionTaken = false
      await subs[i].save()
      updated.push({ subOrderNumber: subs[i].subOrderNumber, scenario: scenario.label })
    }

    return NextResponse.json({ success: true, message: `Updated ${updated.length} sub-orders for SLA testing`, data: updated })
  } catch (err) {
    console.error('SLA seed error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
