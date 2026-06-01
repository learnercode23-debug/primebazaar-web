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
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const query: Record<string, unknown> = {}
    if (role) query.role = role

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, data: users })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
