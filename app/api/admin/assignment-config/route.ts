export const dynamic = 'force-dynamic'
/**
 * GET  /api/admin/assignment-config  → returns current rule
 * PUT  /api/admin/assignment-config  → update rule { rule: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import AssignmentConfig from '@/models/AssignmentConfig'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    // Get or create singleton config
    let config = await AssignmentConfig.findOne().lean()
    if (!config) {
      config = await AssignmentConfig.create({ rule: 'lowest_price' })
    }

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

    const { rule } = await req.json()
    const allowed = ['lowest_price', 'highest_rating', 'round_robin', 'nearest']
    if (!allowed.includes(rule)) {
      return NextResponse.json({ success: false, error: 'Invalid rule' }, { status: 400 })
    }

    const config = await AssignmentConfig.findOneAndUpdate(
      {},
      { rule, updatedBy: user._id },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, data: config })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
