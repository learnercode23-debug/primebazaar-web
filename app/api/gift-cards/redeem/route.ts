export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import GiftCard from '@/models/GiftCard'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Please log in to redeem a gift card' }, { status: 401 })
    await connectDB()
    const { code } = await req.json()
    if (!code?.trim()) return NextResponse.json({ error: 'Enter a gift card code' }, { status: 400 })

    const card = await GiftCard.findOne({ code: code.trim().toUpperCase() })
    if (!card) return NextResponse.json({ error: 'Invalid gift card code' }, { status: 404 })
    if (card.status === 'redeemed' || card.balance <= 0) return NextResponse.json({ error: 'This gift card has already been redeemed' }, { status: 409 })
    if (card.expiresAt < new Date()) {
      card.status = 'expired'; await card.save()
      return NextResponse.json({ error: 'This gift card has expired' }, { status: 409 })
    }

    const credited = card.balance
    card.balance = 0
    card.status = 'redeemed'
    card.redeemedBy = user._id
    await card.save()

    const updated = await User.findByIdAndUpdate(user._id, { $inc: { storeCredit: credited } }, { new: true }).select('storeCredit')

    return NextResponse.json({ data: { credited, storeCredit: updated?.storeCredit || credited } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
