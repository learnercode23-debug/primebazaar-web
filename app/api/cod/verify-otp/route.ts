export const dynamic = 'force-dynamic'
/**
 * POST /api/cod/verify-otp
 * Verifies the OTP the customer entered before placing a COD order.
 * Body: { email, otp }
 * Returns: { success, token } — token is passed back to the COD order route
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import CODVerification from '@/models/CODVerification'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email, otp } = await req.json()
    if (!email || !otp) {
      return NextResponse.json({ success: false, error: 'Email and OTP required' }, { status: 400 })
    }

    const record = await CODVerification.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })

    if (!record) {
      return NextResponse.json({ success: false, error: 'OTP expired or not found. Request a new one.' }, { status: 400 })
    }

    // Brute-force protection: max 5 attempts
    if (record.attempts >= 5) {
      await record.deleteOne()
      return NextResponse.json({ success: false, error: 'Too many attempts. Request a new OTP.' }, { status: 429 })
    }

    if (record.otp !== otp) {
      record.attempts += 1
      await record.save()
      return NextResponse.json({
        success: false,
        error:   `Incorrect OTP. ${5 - record.attempts} attempts remaining.`,
      }, { status: 400 })
    }

    // Mark as verified — the COD route checks this before placing the order
    record.verified = true
    await record.save()

    return NextResponse.json({ success: true, message: 'OTP verified successfully' })
  } catch (err) {
    console.error('COD OTP verify error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
