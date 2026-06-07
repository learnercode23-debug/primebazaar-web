export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const body = await req.json()
    const { name, phone, address, avatar, currentPassword, newPassword } = body

    // Password change flow
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is required' }, { status: 400 })
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ success: false, error: 'New password must be at least 8 characters' }, { status: 400 })
      }
      const userDoc = await User.findById(authUser._id).select('+password')
      if (!userDoc) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      const match = await userDoc.comparePassword(currentPassword)
      if (!match) return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 })
      userDoc.password = newPassword
      userDoc.name    = name  || userDoc.name
      userDoc.phone   = phone || userDoc.phone
      if (address) userDoc.address = address
      if (avatar)  userDoc.avatar  = avatar
      await userDoc.save()
      const updated = await User.findById(authUser._id).select('-password')
      return NextResponse.json({ success: true, data: updated })
    }

    const updated = await User.findByIdAndUpdate(
      authUser._id,
      { name, phone, address, avatar },
      { new: true, select: '-password' }
    )

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
