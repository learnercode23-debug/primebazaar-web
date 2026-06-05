export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/sellers
 * Returns list of active sellers (for admin dropdowns).
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const sellers = await User.find({ role: 'seller', isActive: true })
      .select('name email')
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({ success: true, data: sellers })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
