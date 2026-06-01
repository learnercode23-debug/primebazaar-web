import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Banner from '@/models/Banner'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const body = await req.json()
    const banner = await Banner.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json({ success: true, data: banner })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    await Banner.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true, message: 'Banner deleted' })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
