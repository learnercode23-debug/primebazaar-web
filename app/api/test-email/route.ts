import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordOtp } from '@/lib/email'

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') || 'test@example.com'
  try {
    await sendPasswordOtp(to, '123456', 'Test User')
    return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
