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
    const { name, phone, address, avatar } = body

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
