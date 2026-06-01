import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { runAprioriMining } from '@/lib/apriori'

// GET so admin can trigger from browser address bar too
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  }
  try {
    const result = await runAprioriMining({
      minSupport: 0.005,
      minConfidence: 0.02,
      minLift: 1.0,
      paidOnly: false,
    })
    return NextResponse.json({
      success: true,
      message: `✅ Mining complete — ${result.rulesGenerated} new rules, ${result.rulesUpdated} updated from ${result.totalOrdersProcessed} orders`,
      data: result,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
