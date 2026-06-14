export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { sendEmail, emailDiagnostics } from '@/lib/email'

/**
 * GET /api/test-email?to=someone@example.com
 * Admin-only. Reports exactly what the email setup does:
 *  - which providers are configured
 *  - whether Gmail SMTP auth actually works (verify)
 *  - the real result of attempting a send (which provider, or the error)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  }

  const to = req.nextUrl.searchParams.get('to') || user.email
  const diag = await emailDiagnostics()

  const result = await sendEmail(
    to,
    'PrimePasal email test',
    '<p>This is a test email from PrimePasal. If you received it, email delivery is working. ✅</p>'
  )

  return NextResponse.json({
    success: result.ok,
    sentTo: to,
    deliveredVia: result.ok ? result.via : null,
    error: result.error || null,
    diagnostics: diag,
    hint: !diag.gmailConfigured
      ? 'Gmail not configured — set GMAIL_USER and GMAIL_APP_PASSWORD on Vercel.'
      : !diag.gmailVerify.ok
      ? `Gmail auth/connection failed: ${diag.gmailVerify.error}. Check the app password (16 chars, no spaces) and that 2-Step Verification is on.`
      : result.ok
      ? `Email sent via ${result.via}. If you do not see it, check the spam folder.`
      : 'Gmail verified but send failed — see error above.',
  }, { status: result.ok ? 200 : 500 })
}
