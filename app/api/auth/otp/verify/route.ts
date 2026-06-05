export const dynamic = 'force-dynamic'
/**
 * POST /api/auth/otp/verify
 * Body: { phone: "+9779801234567", otp: "123456" }
 *
 * Verifies the OTP. On success:
 *   - If user with this phone exists → logs them in (return JWT)
 *   - If new user → creates account with phone, returns JWT
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { signToken } from '@/lib/auth'
import PhoneOtp from '@/models/PhoneOtp'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { phone, otp, name } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json({ success: false, error: 'Phone and OTP are required' }, { status: 400 })
    }

    // Find the most recent unused OTP for this phone
    const record = await PhoneOtp.findOne({
      phone,
      used: false,
      expiresAt: { $gte: new Date() },
    }).sort({ createdAt: -1 })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'OTP expired or not found. Request a new one.' },
        { status: 400 }
      )
    }

    // Increment attempt counter (max 5 attempts)
    record.attempts += 1
    if (record.attempts > 5) {
      record.used = true
      await record.save()
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Request a new OTP.' },
        { status: 400 }
      )
    }

    if (record.otp !== String(otp).trim()) {
      await record.save()
      return NextResponse.json(
        { success: false, error: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.` },
        { status: 400 }
      )
    }

    // OTP matched — mark as used
    record.used = true
    await record.save()

    // Find or create user
    let user = await User.findOne({ phone })
    if (!user) {
      // New user — create account
      user = await User.create({
        name: name || `User ${phone.slice(-4)}`,
        email: `${phone.replace('+', '')}@phone.primebazaar`,
        phone,
        password: Math.random().toString(36) + Math.random().toString(36), // random unused password
        role: 'customer',
        emailVerified: false,
      })
    }

    const token = signToken(user._id.toString(), user.role)

    const res = NextResponse.json({
      success: true,
      isNewUser: !user.name || user.name.startsWith('User '),
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    })

    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days on mobile
      path: '/',
    })

    // Also return token in response body — React Native apps use this directly
    return NextResponse.json({
      success: true,
      token,
      isNewUser: !user.createdAt || (Date.now() - user.createdAt.getTime()) < 5000,
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('OTP verify error:', err)
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
  }
}
