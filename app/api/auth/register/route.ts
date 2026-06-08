export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await User.create({
      name,
      email,
      password,
      role: role === 'seller' ? 'seller' : 'customer',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    })

    // Send both emails non-blocking
    const userRole = role === 'seller' ? 'seller' : 'customer'
    sendVerificationEmail(email, name, verificationToken).catch((err) => console.error('[EMAIL] Verification email failed:', err))
    sendWelcomeEmail(email, name, userRole).catch((err) => console.error('[EMAIL] Welcome email failed:', err))

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
