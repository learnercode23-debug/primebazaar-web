export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'

// POST /api/push-tokens  — called by the mobile app after login to register its Expo push token
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { token } = await req.json()
    if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
      return NextResponse.json({ success: false, error: 'Invalid token format' }, { status: 400 })
    }

    await connectDB()
    await User.findByIdAndUpdate(user._id, { expoPushToken: token })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/push-tokens  — called on logout so stale tokens don't receive notifications
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    await User.findByIdAndUpdate(user._id, { $unset: { expoPushToken: '' } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
