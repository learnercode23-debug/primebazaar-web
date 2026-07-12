export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Newsletter from '@/models/Newsletter'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    await Newsletter.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $setOnInsert: { email: email.toLowerCase() } },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Duplicate key (already subscribed) is a success from the user's perspective
    if (err?.code === 11000) {
      return NextResponse.json({ success: true })
    }
    console.error('[Newsletter]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
