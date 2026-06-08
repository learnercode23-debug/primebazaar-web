export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid-token', req.url))
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gte: new Date() },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=token-expired', req.url))
    }

    user.emailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpiry = undefined
    await user.save()

    // Send welcome email now that they're verified
    sendWelcomeEmail(user.email, user.name, user.role).catch(() => {})

    return NextResponse.redirect(new URL('/login?verified=1', req.url))
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(new URL('/login?error=server-error', req.url))
  }
}
