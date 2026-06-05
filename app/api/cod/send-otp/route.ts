export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/send-otp
 * Sends a 6-digit OTP to the customer's email before placing a COD order.
 * Body: { email }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import CODVerification from '@/models/CODVerification'
import { sendEmail } from '@/lib/email'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  // Must be logged in to request a COD OTP (prevents email spam)
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 })
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })

    const otp       = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any previous unverified OTP for this email
    await CODVerification.deleteMany({ email, verified: false })

    await CODVerification.create({ email, otp, expiresAt, verified: false })

    // Send OTP email
    await sendEmail(
      email,
      'Your COD Order Verification Code — Primepasal',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Confirm Your Cash on Delivery Order</h2>
        <p>Use the code below to confirm your COD order. Valid for <strong>10 minutes</strong>.</p>
        <div style="background:#f4f4f4;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#232050">${otp}</span>
        </div>
        <p style="color:#666;font-size:13px">If you did not request this, ignore this email. Do not share this code.</p>
      </div>`
    )

    return NextResponse.json({ success: true, message: 'OTP sent to your email' })
  } catch (err) {
    console.error('COD OTP send error:', err)
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 })
  }
}
