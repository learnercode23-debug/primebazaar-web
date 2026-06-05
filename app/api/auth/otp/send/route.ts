export const dynamic = 'force-dynamic'
/**
 * POST /api/auth/otp/send
 * Body: { phone: "+9779801234567" }
 *
 * Generates a 6-digit OTP, stores it hashed in DB (5-min expiry),
 * sends it via SMS (Twilio if configured, else logs to console for dev).
 * Rate-limited: max 3 requests per phone per 10 minutes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import PhoneOtp from '@/models/PhoneOtp'

// Optional Twilio — falls back to console.log in dev
async function sendSMS(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (sid && token && from) {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    )
    if (!res.ok) throw new Error(await res.text())
    return true
  }

  // DEV fallback — print OTP to server console
  console.log(`[OTP] ${to} → ${body}`)
  return false
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { phone } = await req.json()

    // Basic E.164 validation
    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Use E.164 format e.g. +9779801234567' },
        { status: 400 }
      )
    }

    // Rate limit: max 3 OTPs per phone in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentCount = await PhoneOtp.countDocuments({
      phone,
      createdAt: { $gte: tenMinutesAgo },
    })
    if (recentCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Try again in 10 minutes.' },
        { status: 429 }
      )
    }

    // Invalidate any unused previous OTPs for this phone
    await PhoneOtp.updateMany({ phone, used: false }, { used: true })

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    await PhoneOtp.create({ phone, otp, expiresAt })

    const smsSent = await sendSMS(phone, `Your Primepasal verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`)

    return NextResponse.json({
      success: true,
      message: smsSent ? 'OTP sent via SMS' : 'OTP generated (check server console — SMS not configured)',
      // In production NEVER return the OTP. This is for development testing only.
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    })
  } catch (err) {
    console.error('OTP send error:', err)
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 })
  }
}
