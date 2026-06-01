import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { runSettlement, releaseAvailableEarnings } from '@/lib/settlement'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })

  // First release earnings whose return window has passed
  const released = await releaseAvailableEarnings()

  // Then run the settlement and create payouts
  const result = await runSettlement(user._id.toString())

  return NextResponse.json({
    success: true,
    message: `Released ${released.released} earnings. Created ${result.payoutsCreated} payouts.`,
    data: { ...result, released },
  })
}
