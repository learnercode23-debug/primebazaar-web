export const dynamic = 'force-dynamic'
/**
 * GET  /api/admin/sla-config  → returns current SLA settings
 * PUT  /api/admin/sla-config  → update SLA settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SLAConfig from '@/models/SLAConfig'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    let config = await SLAConfig.findOne().lean()
    if (!config) config = await SLAConfig.create({})

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { acceptHours, shipDays, onAcceptBreach, onShipBreach, notifyAdmin } = await req.json()

    const config = await SLAConfig.findOneAndUpdate(
      {},
      {
        ...(acceptHours    != null && { acceptHours: Number(acceptHours) }),
        ...(shipDays       != null && { shipDays:    Number(shipDays) }),
        ...(onAcceptBreach && { onAcceptBreach }),
        ...(onShipBreach   && { onShipBreach }),
        ...(notifyAdmin    != null && { notifyAdmin }),
        updatedBy: user._id,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
