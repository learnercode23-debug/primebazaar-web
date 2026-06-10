export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Notification from '@/models/Notification'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { title, message, link, targetRole } = await req.json()
    if (!title?.trim() || !message?.trim()) return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
    const query = targetRole && targetRole !== 'all' ? { role: targetRole } : {}
    const users = await User.find(query).select('_id').lean()
    if (users.length === 0) return NextResponse.json({ data: { sent: 0 } })
    const docs = users.map(u => ({
      user: new mongoose.Types.ObjectId(u._id as string),
      type: 'promotion' as const,
      title: title.trim(),
      message: message.trim(),
      link: link?.trim() || undefined,
      isRead: false,
    }))
    await Notification.insertMany(docs)
    return NextResponse.json({ data: { sent: users.length } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const recent = await Notification.aggregate([
      { $match: { type: 'promotion' } },
      { $group: {
        _id: { title: '$title', message: '$message', link: '$link' },
        sentAt: { $max: '$createdAt' },
        recipients: { $sum: 1 },
        read: { $sum: { $cond: ['$isRead', 1, 0] } },
        title: { $first: '$title' },
        message: { $first: '$message' },
        link: { $first: '$link' },
      }},
      { $sort: { sentAt: -1 } },
      { $limit: 20 },
    ])
    return NextResponse.json({ data: recent })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
