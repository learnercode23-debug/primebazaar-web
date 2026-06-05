export const dynamic = 'force-dynamic'
/**
 * GET  /api/admin/commission/rules  — list all rules
 * POST /api/admin/commission/rules  — create a new rule
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import CommissionRule from '@/models/CommissionRule'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    await connectDB()

    const rules = await CommissionRule.find()
      .populate('createdBy', 'name')
      .sort({ scope: 1, createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, data: rules })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    await connectDB()

    const { scope, refId, rateType, rateValue, activeFrom, activeTo, description } = await req.json()
    if (!scope || rateValue == null) {
      return NextResponse.json({ error: 'scope and rateValue required' }, { status: 400 })
    }

    const rule = await CommissionRule.create({
      scope, refId: refId || undefined, rateType: rateType || 'percentage',
      rateValue: Number(rateValue),
      activeFrom: activeFrom || undefined,
      activeTo:   activeTo   || undefined,
      description, isActive: true, createdBy: user._id,
    })

    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
