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
  // Read-only status check — no auth, no email sent, no secrets revealed.
  // Visit /api/test-email?check=1 to see if Gmail SMTP auth actually works.
  if (req.nextUrl.searchParams.get('check') === '1') {
    const diag = await emailDiagnostics()
    return NextResponse.json({
      gmailConfigured: diag.gmailConfigured,
      gmailFrom: diag.gmailFrom,
      gmailAuthWorks: diag.gmailVerify.ok,
      gmailError: diag.gmailVerify.error || null,
      resendConfigured: diag.resendConfigured,
      verdict: !diag.gmailConfigured
        ? 'Gmail NOT configured on this deployment.'
        : diag.gmailVerify.ok
        ? 'Gmail auth OK — emails should send. If users do not get them, check spam.'
        : `Gmail auth FAILING: ${diag.gmailVerify.error}`,
    })
  }

  // Sending a real test email still requires admin (or ?secret=CRON_SECRET).
  const secret = req.nextUrl.searchParams.get('secret')
  const secretOk = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET
  const user = await getAuthUser(req)
  if (!secretOk && (!user || user.role !== 'admin')) {
    return NextResponse.json({ success: false, error: 'Admin only — sign in as admin, or use ?check=1 for a no-login status check' }, { status: 403 })
  }

  const to = req.nextUrl.searchParams.get('to') || user?.email || 'test@example.com'
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
