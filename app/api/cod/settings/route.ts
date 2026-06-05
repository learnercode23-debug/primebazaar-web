export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import CODSettings from '@/models/CODSettings'

// GET — public, used at checkout to check eligibility
export async function GET() {
  await connectDB()
  const settings = await CODSettings.findOne().lean() || {
    maxOrderValue: 50000, handlingFee: 50, handlingFeeType: 'fixed',
    isEnabled: true, serviceablePincodes: [], otpRequired: false,
  }
  return NextResponse.json({ success: true, data: settings })
}

// PUT — admin only, update settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()
    const body = await req.json()

    // Only update known fields — never pass _id, __v, createdAt, updatedAt
    const allowed: Record<string, unknown> = {}
    if (body.maxOrderValue             != null) allowed.maxOrderValue             = Number(body.maxOrderValue)
    if (body.handlingFee               != null) allowed.handlingFee               = Number(body.handlingFee)
    if (body.handlingFeeType)                   allowed.handlingFeeType           = body.handlingFeeType
    if (body.isEnabled                 != null) allowed.isEnabled                 = Boolean(body.isEnabled)
    if (body.otpRequired               != null) allowed.otpRequired               = Boolean(body.otpRequired)
    if (body.maxDailyOrdersPerCustomer != null) allowed.maxDailyOrdersPerCustomer = Number(body.maxDailyOrdersPerCustomer)
    if (Array.isArray(body.serviceablePincodes)) allowed.serviceablePincodes      = body.serviceablePincodes

    const settings = await CODSettings.findOneAndUpdate(
      {},
      { $set: allowed },
      { upsert: true, new: true, runValidators: true }
    )
    return NextResponse.json({ success: true, data: settings })
  } catch (err) {
    console.error('COD settings save error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
