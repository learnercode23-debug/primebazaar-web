// @ts-nocheck
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Conversation from '@/models/Conversation'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ count: 0 })
    await connectDB()

    const isSeller = user.role === 'seller' || user.role === 'admin'
    const field    = isSeller ? 'unreadBySeller' : 'unreadByCustomer'
    const filter   = isSeller ? { seller: user._id } : { customer: user._id }

    const result = await Conversation.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ])
    const count = result[0]?.total || 0

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
