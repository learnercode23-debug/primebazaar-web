export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { signToken } from '@/lib/auth'
import User from '@/models/User'
import { sendLoginAlert } from '@/lib/email'

// Simple in-memory rate limiter: max 10 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    await connectDB()
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    const user = await User.findOne({ email, isActive: true })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.emailVerified) {
      return NextResponse.json({ success: false, error: 'Please verify your email before logging in. Check your inbox.' }, { status: 403 })
    }

    const token = signToken(user._id.toString(), user.role)

    // Send login alert email (non-blocking)
    const alertIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined
    const loginTime = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kathmandu' })
    sendLoginAlert(user.email, user.name, loginTime, alertIp).catch(() => {})

    const res = NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    })

    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
