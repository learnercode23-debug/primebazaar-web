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
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  await connectDB()
  const body = await req.json()
  const settings = await CODSettings.findOneAndUpdate(
    {},
    { ...body, updatedBy: user._id },
    { upsert: true, new: true }
  )
  return NextResponse.json({ success: true, data: settings })
}
