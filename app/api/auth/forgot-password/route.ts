export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import PasswordReset from '@/models/PasswordReset'
import { sendPasswordOtp } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email } = await req.json()

    if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })

    const user = await User.findOne({ email: email.toLowerCase() }).select('name email')
    // Always return success to prevent email enumeration attacks
    if (!user) return NextResponse.json({ success: true, message: 'If that email exists, an OTP was sent.' })

    // Rate limit: max 3 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recent = await PasswordReset.countDocuments({ email: email.toLowerCase(), createdAt: { $gte: oneHourAgo } })
    if (recent >= 3) {
      return NextResponse.json({ success: false, error: 'Too many requests. Try again in 1 hour.' }, { status: 429 })
    }

    // Invalidate previous OTPs
    await PasswordReset.updateMany({ email: email.toLowerCase(), used: false }, { used: true })

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await PasswordReset.create({ email: email.toLowerCase(), otp, expiresAt })

    await sendPasswordOtp(email, otp, user.name)

    // In development, expose OTP so devs can test without email setup
    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined

    return NextResponse.json({ success: true, message: 'OTP sent to your registered email.', devOtp })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
