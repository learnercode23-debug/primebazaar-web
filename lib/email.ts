import { Resend } from 'resend'
import nodemailer from 'nodemailer'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://primepasal.com'

const TIMEOUTS = { connectionTimeout: 10000, greetingTimeout: 8000, socketTimeout: 10000 }

// ── Primary SMTP transporter ──────────────────────────────────────────────────
// Prefers a custom SMTP provider (e.g. Hostinger / Titan on your own domain),
// falls back to Gmail. Sending from your own domain gets mail into the inbox.
let smtpTransporter: nodemailer.Transporter | null = null
let MAIL_FROM = 'Primepasal <onboarding@resend.dev>'
let MAIL_USER: string | undefined        // the authenticated mailbox (for reply-to)
let MAIL_PROVIDER: 'smtp' | 'gmail' | 'none' = 'none'

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // Custom SMTP — Hostinger: host smtp.hostinger.com, port 465 (SSL).
  const port = parseInt(process.env.SMTP_PORT || '465')
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    ...TIMEOUTS,
  })
  MAIL_USER = process.env.SMTP_USER
  MAIL_FROM = process.env.EMAIL_FROM || `PrimePasal <${process.env.SMTP_USER}>`
  MAIL_PROVIDER = 'smtp'
} else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  // Gmail app passwords show as "abcd efgh ijkl mnop" — strip spaces so a paste works.
  const gmailPass = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
  smtpTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.GMAIL_USER, pass: gmailPass },
    ...TIMEOUTS,
  })
  MAIL_USER = process.env.GMAIL_USER
  MAIL_FROM = process.env.EMAIL_FROM || `Primepasal <${process.env.GMAIL_USER}>`
  MAIL_PROVIDER = 'gmail'
}

// ── Resend fallback (free plan only delivers to Resend account email) ─────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.RESEND_FROM_EMAIL || MAIL_FROM

function resolveRecipient(to: string): string {
  return process.env.RESEND_TO_OVERRIDE || to
}

export interface SendResult { ok: boolean; via: 'smtp' | 'gmail' | 'resend' | 'none'; error?: string }

// When RESEND_FROM_EMAIL is set (i.e. you verified your domain in Resend),
// prefer Resend — it has proper SPF/DKIM and lands in the inbox, not spam.
const PREFER_RESEND = !!resend && !!process.env.RESEND_FROM_EMAIL

// ── Unified send — tries the best provider first, falls back to the other ─────
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  // Plain-text fallback improves spam scoring vs HTML-only mail
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const errors: string[] = []

  async function trySmtp(): Promise<SendResult | null> {
    if (!smtpTransporter) return null
    try {
      await smtpTransporter.sendMail({ from: MAIL_FROM, to, subject, html, text, replyTo: MAIL_USER })
      console.log(`[EMAIL] Sent via ${MAIL_PROVIDER} SMTP to:`, to)
      return { ok: true, via: MAIL_PROVIDER === 'gmail' ? 'gmail' : 'smtp' }
    } catch (err) {
      errors.push(`smtp: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  async function tryResend(): Promise<SendResult | null> {
    if (!resend) return null
    try {
      const recipient = resolveRecipient(to)
      const { error } = await resend.emails.send({ from: FROM, to: recipient, subject, html, text })
      if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
      console.log('[EMAIL] Sent via Resend to:', recipient)
      return { ok: true, via: 'resend' }
    } catch (err) {
      errors.push(`resend: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  const order = PREFER_RESEND ? [tryResend, trySmtp] : [trySmtp, tryResend]
  for (const attempt of order) {
    const result = await attempt()
    if (result) return result
  }

  console.log('[EMAIL] All providers failed. Subject:', subject, '→', to, errors)
  return { ok: false, via: 'none', error: errors.join(' | ') || 'No email provider configured' }
}

// ── Diagnostics — used by /api/test-email to pinpoint delivery problems ────────
export async function emailDiagnostics(): Promise<{
  gmailConfigured: boolean; resendConfigured: boolean
  gmailFrom?: string; resendFrom: string; provider: string
  gmailVerify: { ok: boolean; error?: string }
}> {
  let smtpVerify: { ok: boolean; error?: string } = { ok: false, error: 'No SMTP transporter configured' }
  if (smtpTransporter) {
    try {
      await smtpTransporter.verify()  // tests the SMTP connection + auth
      smtpVerify = { ok: true }
    } catch (err) {
      smtpVerify = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
  return {
    gmailConfigured: !!smtpTransporter,   // "is a sending transporter configured"
    resendConfigured: !!resend,
    gmailFrom: MAIL_FROM,
    resendFrom: FROM,
    provider: MAIL_PROVIDER,
    gmailVerify: smtpVerify,
  }
}

// ── HTML wrapper ──────────────────────────────────────────────────────────────
function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Primepasal</title></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.08)">
      <tr><td style="background:linear-gradient(135deg,#1E1B4B 0%,#4C1D95 100%);padding:28px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px">primepasal<span style="color:#C4B5FD">.</span></h1>
      </td></tr>
      <tr><td style="padding:32px">${content}</td></tr>
      <tr><td style="background:#F5F3FF;padding:20px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:#9CA3AF">
          © ${new Date().getFullYear()} Primepasal. All rights reserved.<br>
          <a href="${BASE}" style="color:#7C3AED;text-decoration:none">primepasal.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ── Email verification ────────────────────────────────────────────────────────
export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${BASE}/api/auth/verify-email?token=${token}`
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">✉️</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:24px;font-weight:800">Verify your email</h2>
      <p style="margin:0;color:#6B7280;font-size:15px">Hi ${name}, click the button below to activate your account.</p>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${link}" style="display:inline-block;background:#7C3AED;color:#fff;padding:16px 40px;border-radius:999px;text-decoration:none;font-weight:800;font-size:16px">Verify Email →</a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9CA3AF">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`
  await sendEmail(to, 'Verify your Primepasal account', emailWrapper(content))
}

// ── Welcome email ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, role: string) {
  const isSeller = role === 'seller'
  const ctaHref  = isSeller ? `${BASE}/seller` : `${BASE}/products`
  const ctaText  = isSeller ? 'Go to Seller Hub' : 'Start Shopping'
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">${isSeller ? '🏪' : '🛒'}</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:24px;font-weight:800">Welcome to Primepasal, ${name}!</h2>
      <p style="margin:0;color:#6B7280;font-size:15px">Your ${isSeller ? 'seller' : 'customer'} account is ready.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Account Type</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#1E1B4B;text-transform:capitalize">${role}</p>
    </div>
    ${isSeller ? `
    <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400E">🚀 Seller Quick-Start</p>
      <ul style="margin:0;padding-left:20px;color:#6B7280;font-size:13px;line-height:1.8">
        <li>Add your first product from the Seller Hub</li>
        <li>Set up your store profile</li>
        <li>Start receiving orders!</li>
      </ul>
    </div>` : `
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#065F46">🎁 Welcome Gift</p>
      <p style="margin:0;font-size:13px;color:#6B7280">Use code <strong style="color:#7C3AED">NEWUSER</strong> for 15% off your first order!</p>
    </div>`}
    <div style="text-align:center">
      <a href="${ctaHref}" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px">${ctaText} →</a>
    </div>`
  await sendEmail(to, `Welcome to Primepasal, ${name}! 🎉`, emailWrapper(content))
}

// ── Login alert ───────────────────────────────────────────────────────────────
export async function sendLoginAlert(to: string, name: string, loginTime: string, ip?: string) {
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">🔐</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:22px;font-weight:800">New sign-in detected</h2>
      <p style="margin:0;color:#6B7280;font-size:14px">Hi ${name}, someone just signed into your account.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;font-size:13px;color:#6B7280">Date &amp; Time</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">${loginTime}</td></tr>
        ${ip ? `<tr><td style="padding:6px 0;font-size:13px;color:#6B7280">IP Address</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">${ip}</td></tr>` : ''}
        <tr><td style="padding:6px 0;font-size:13px;color:#6B7280">Platform</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">Primepasal Web</td></tr>
      </table>
    </div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#991B1B">⚠️ <strong>Wasn't you?</strong> Secure your account immediately by changing your password.</p>
    </div>
    <div style="text-align:center">
      <a href="${BASE}/forgot-password" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px">Secure My Account</a>
    </div>`
  await sendEmail(to, `New sign-in to your Primepasal account`, emailWrapper(content))
}

// ── Password reset OTP ────────────────────────────────────────────────────────
export async function sendPasswordOtp(to: string, otp: string, name: string) {
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">🔑</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:22px;font-weight:800">Reset your password</h2>
      <p style="margin:0;color:#6B7280;font-size:14px">Hi ${name}, use this code to reset your Primepasal password.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
      <p style="margin:0 0 8px;font-size:13px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:1px">Your OTP Code</p>
      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#1E1B4B;font-family:monospace">${otp}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF">Valid for 10 minutes · Do not share this code</p>
    </div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px">
      <p style="margin:0;font-size:13px;color:#991B1B">⚠️ If you didn't request this, ignore this email. Your password won't change.</p>
    </div>`
  await sendEmail(to, `${otp} is your Primepasal password reset code`, emailWrapper(content))
}

// ── Order confirmation ────────────────────────────────────────────────────────
export async function sendOrderConfirmation(to: string, order: {
  orderNumber: string; total: number
  items: Array<{ title: string; quantity: number; price: number; image: string }>
  shippingAddress: { name: string; street: string; city: string; state: string }
  estimatedDelivery?: string
}) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee"><img src="${item.image}" width="48" height="48" style="border-radius:4px;object-fit:cover"/></td>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">Rs. ${Math.round(item.price * item.quantity).toLocaleString()}</td>
    </tr>`).join('')

  const content = `
    <h2 style="color:#1E1B4B">Thanks for your order, ${order.shippingAddress.name}!</h2>
    <p>Order #<strong>${order.orderNumber}</strong> has been confirmed.</p>
    ${order.estimatedDelivery ? `<p>Estimated delivery: <strong>${order.estimatedDelivery}</strong></p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#F5F3FF">
        <th style="padding:8px;text-align:left"></th>
        <th style="padding:8px;text-align:left">Item</th>
        <th style="padding:8px;text-align:center">Qty</th>
        <th style="padding:8px;text-align:right">Price</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="text-align:right;font-size:18px"><strong>Total: Rs. ${Math.round(order.total).toLocaleString()}</strong></p>
    <div style="text-align:center;margin-top:16px">
      <a href="${BASE}/orders" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">View Order</a>
    </div>`
  await sendEmail(to, `Order Confirmed — ${order.orderNumber}`, emailWrapper(content))
}

// ── Shipping notification ─────────────────────────────────────────────────────
export async function sendShippingNotification(to: string, data: {
  orderNumber: string; trackingNumber: string; carrier?: string; estimatedDelivery?: string
}) {
  const content = `
    <h2 style="color:#1E1B4B">🚚 Your order is on its way!</h2>
    <p>Order <strong>${data.orderNumber}</strong> has been shipped.</p>
    <p>Tracking: <strong>${data.trackingNumber}</strong>${data.carrier ? ` via ${data.carrier}` : ''}</p>
    ${data.estimatedDelivery ? `<p>Expected by <strong>${data.estimatedDelivery}</strong></p>` : ''}
    <div style="text-align:center;margin-top:16px">
      <a href="${BASE}/orders" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Track Order</a>
    </div>`
  await sendEmail(to, `Your order ${data.orderNumber} has shipped!`, emailWrapper(content))
}

// ── Order cancelled ───────────────────────────────────────────────────────────
export async function sendOrderCancelledEmail(to: string, data: {
  name: string; orderNumber: string; total: number
  cancelledBy: 'customer' | 'admin'
  items: Array<{ title: string; quantity: number }>
}) {
  const itemsHtml = data.items.map(item =>
    `<li style="padding:4px 0;font-size:13px;color:#374151">${item.title} × ${item.quantity}</li>`
  ).join('')
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#FEE2E2;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">❌</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:24px;font-weight:800">Order Cancelled</h2>
      <p style="margin:0;color:#6B7280;font-size:15px">Hi ${data.name}, your order has been cancelled.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:12px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#1E1B4B">${data.orderNumber}</p>
    </div>
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 10px;font-size:13px;color:#6B7280;font-weight:600">Items in this order:</p>
      <ul style="margin:0;padding-left:18px">${itemsHtml}</ul>
      <p style="margin:12px 0 0;font-size:15px;font-weight:700;color:#1E1B4B;text-align:right">Total: Rs. ${Math.round(data.total).toLocaleString()}</p>
    </div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#991B1B">
        ${data.cancelledBy === 'admin'
          ? '⚠️ This order was cancelled by our team. If you have questions, please contact support.'
          : 'ℹ️ You cancelled this order. If this was a mistake, please place a new order.'}
      </p>
    </div>
    <div style="text-align:center">
      <a href="${BASE}/orders" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px">View My Orders →</a>
    </div>`
  await sendEmail(to, `Order ${data.orderNumber} has been cancelled`, emailWrapper(content))
}

// ── Back-in-stock alert ───────────────────────────────────────────────────────
export async function sendBackInStockEmail(to: string, productTitle: string, productUrl: string) {
  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#D1FAE5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">📦</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:22px;font-weight:800">Back in Stock!</h2>
      <p style="margin:0;color:#6B7280;font-size:14px">Great news — a product you wanted is available again.</p>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Product</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#1E1B4B">${productTitle}</p>
    </div>
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#065F46">⚡ Stock is limited — order quickly before it sells out again!</p>
    </div>
    <div style="text-align:center">
      <a href="${productUrl}" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px">Buy Now →</a>
    </div>`
  await sendEmail(to, `${productTitle} is back in stock!`, emailWrapper(content))
}

// ── Return update ─────────────────────────────────────────────────────────────
export async function sendReturnUpdate(to: string, data: {
  returnNumber: string; status: string; refundAmount?: number
}) {
  const messages: Record<string, string> = {
    approved:  'Your return has been approved. Please ship the item back.',
    rejected:  'Unfortunately, your return request has been rejected.',
    completed: `Your refund of Rs. ${Math.round(data.refundAmount || 0).toLocaleString()} has been processed.`,
  }
  const content = `
    <h2 style="color:#1E1B4B">Return Request Update</h2>
    <p>Return #<strong>${data.returnNumber}</strong></p>
    <p>${messages[data.status] || `Status updated to: ${data.status}`}</p>
    <div style="text-align:center;margin-top:16px">
      <a href="${BASE}/orders" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">View Details</a>
    </div>`
  await sendEmail(to, `Return ${data.returnNumber} — ${data.status}`, emailWrapper(content))
}
