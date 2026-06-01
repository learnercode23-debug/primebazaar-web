import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import PasswordReset from '@/models/PasswordReset'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ success: false, error: 'Email, OTP and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const record = await PasswordReset.findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gte: new Date() },
    }).sort({ createdAt: -1 })

    if (!record) {
      return NextResponse.json({ success: false, error: 'OTP expired or not found. Request a new one.' }, { status: 400 })
    }

    record.attempts += 1
    if (record.attempts > 5) {
      record.used = true
      await record.save()
      return NextResponse.json({ success: false, error: 'Too many wrong attempts. Request a new OTP.' }, { status: 400 })
    }

    if (record.otp !== String(otp).trim()) {
      await record.save()
      return NextResponse.json({
        success: false,
        error: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.`
      }, { status: 400 })
    }

    // OTP correct — update password
    record.used = true
    await record.save()

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    user.password = newPassword  // model pre-save hook hashes it
    await user.save()

    return NextResponse.json({ success: true, message: 'Password reset successfully! You can now sign in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
