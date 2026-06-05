export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ exists: false })
  await connectDB()
  const user = await User.findOne({ email: email.toLowerCase() }).select('name').lean()
  return NextResponse.json({ exists: !!user, name: user ? (user as { name?: string }).name : null })
}
