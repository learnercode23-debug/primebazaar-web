export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'
import Notification from '@/models/Notification'
import Review from '@/models/Review'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const q = new URL(req.url).searchParams.get('q') || ''
    const query = q ? { $or: [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ]} : {}
    const users = await User.find(query).select('name email role createdAt isActive').limit(20).lean()
    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { userId, reason } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const anonEmail = `gdpr_deleted_${userId}@primepasal.deleted`
    await User.findByIdAndUpdate(userId, { $set: {
      name: '[Deleted User]',
      email: anonEmail,
      phone: '',
      avatar: '',
      addresses: [],
      isActive: false,
    }})
    await Notification.deleteMany({ user: userId })
    await Review.updateMany({ user: userId }, { $set: { authorName: '[Deleted]' } })
    return NextResponse.json({ data: { success: true, anonymizedEmail: anonEmail } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
