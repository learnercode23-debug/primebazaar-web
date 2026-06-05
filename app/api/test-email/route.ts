export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { sendPasswordOtp } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Admin-only — prevent email abuse
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  }

  const to = req.nextUrl.searchParams.get('to') || 'test@example.com'
  try {
    await sendPasswordOtp(to, '123456', 'Test User')
    return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
