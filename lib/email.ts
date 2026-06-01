import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Primebazaar <onboarding@resend.dev>'
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://primebazaar-web.vercel.app'

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Primebazaar</title></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.08)">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1E1B4B 0%,#4C1D95 100%);padding:28px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px">
          primebazaar<span style="color:#C4B5FD">.</span>
        </h1>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px">${content}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#F5F3FF;padding:20px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:#9CA3AF">
          © ${new Date().getFullYear()} Primebazaar. All rights reserved.<br>
          <a href="${BASE}" style="color:#7C3AED;text-decoration:none">primebazaar-web.vercel.app</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function sendWelcomeEmail(to: string, name: string, role: string) {
  if (!resend) { console.log('[EMAIL] Welcome (no key):', to); return }
  const isSeller = role === 'seller'
  const ctaHref  = isSeller ? `${BASE}/seller` : `${BASE}/products`
  const ctaText  = isSeller ? 'Go to Seller Hub' : 'Start Shopping'

  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">
        ${isSeller ? '🏪' : '🛒'}
      </div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:24px;font-weight:800">
        Welcome to Primebazaar, ${name}!
      </h2>
      <p style="margin:0;color:#6B7280;font-size:15px">
        Your ${isSeller ? 'seller' : 'customer'} account is ready.
      </p>
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
      <a href="${ctaHref}" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px">
        ${ctaText} →
      </a>
    </div>
  `
  await resend.emails.send({ from: FROM, to, subject: `Welcome to Primebazaar, ${name}! 🎉`, html: emailWrapper(content) })
}

export async function sendLoginAlert(to: string, name: string, loginTime: string, ip?: string) {
  if (!resend) { console.log('[EMAIL] Login alert (no key):', to); return }

  const content = `
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#EDE9FE;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">🔐</div>
      <h2 style="margin:0 0 8px;color:#1E1B4B;font-size:22px;font-weight:800">New sign-in detected</h2>
      <p style="margin:0;color:#6B7280;font-size:14px">Hi ${name}, someone just signed into your account.</p>
    </div>

    <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6B7280">Date &amp; Time</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">${loginTime}</td>
        </tr>
        ${ip ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6B7280">IP Address</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">${ip}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6B7280">Platform</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1E1B4B;text-align:right">Primebazaar Web</td>
        </tr>
      </table>
    </div>

    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#991B1B">
        ⚠️ <strong>Wasn't you?</strong> Secure your account immediately by changing your password.
      </p>
    </div>

    <div style="text-align:center">
      <a href="${BASE}/login" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px">
        Secure My Account
      </a>
    </div>
  `
  await resend.emails.send({ from: FROM, to, subject: `New sign-in to your Primebazaar account`, html: emailWrapper(content) })
}

function orderItemsHtml(items: Array<{ title: string; quantity: number; price: number; image: string }>) {
  return items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">
        <img src="${item.image}" width="48" height="48" style="border-radius:4px;object-fit:cover" />
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('')
}

export async function sendOrderConfirmation(to: string, order: {
  orderNumber: string
  total: number
  items: Array<{ title: string; quantity: number; price: number; image: string }>
  shippingAddress: { name: string; street: string; city: string; state: string }
  estimatedDelivery?: string
}) {
  if (!resend) {
    console.log('[EMAIL] Order confirmation (no Resend key):', order.orderNumber)
    return
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#131921;padding:20px;text-align:center">
          <h1 style="color:#FFD814;margin:0">primebazaar<span style="color:#FFD814">.</span></h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#131921">Thanks for your order, ${order.shippingAddress.name}!</h2>
          <p>Order #<strong>${order.orderNumber}</strong> has been confirmed.</p>
          ${order.estimatedDelivery ? `<p>Estimated delivery: <strong>${order.estimatedDelivery}</strong></p>` : ''}
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left"></th>
                <th style="padding:8px;text-align:left">Item</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${orderItemsHtml(order.items)}</tbody>
          </table>
          <p style="text-align:right;font-size:18px"><strong>Total: $${order.total.toFixed(2)}</strong></p>
          <a href="${process.env.NEXTAUTH_URL}/orders" style="display:inline-block;background:#FFD814;color:#131921;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">View Order</a>
        </div>
      </div>
    `,
  })
}

export async function sendShippingNotification(to: string, data: {
  orderNumber: string
  trackingNumber: string
  carrier?: string
  estimatedDelivery?: string
}) {
  if (!resend) {
    console.log('[EMAIL] Shipping notification (no Resend key):', data.orderNumber)
    return
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your order ${data.orderNumber} has shipped!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#131921;padding:20px;text-align:center">
          <h1 style="color:#FFD814;margin:0">primebazaar<span>.</span></h1>
        </div>
        <div style="padding:24px">
          <h2>🚚 Your order is on its way!</h2>
          <p>Order <strong>${data.orderNumber}</strong> has been shipped.</p>
          <p>Tracking: <strong>${data.trackingNumber}</strong>${data.carrier ? ` via ${data.carrier}` : ''}</p>
          ${data.estimatedDelivery ? `<p>Expected by <strong>${data.estimatedDelivery}</strong></p>` : ''}
          <a href="${process.env.NEXTAUTH_URL}/orders" style="display:inline-block;background:#FFD814;color:#131921;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Track Order</a>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordReset(to: string, resetLink: string) {
  if (!resend) {
    console.log('[EMAIL] Password reset link:', resetLink)
    return
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Primebazaar password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#131921;padding:20px;text-align:center">
          <h1 style="color:#FFD814;margin:0">primebazaar<span>.</span></h1>
        </div>
        <div style="padding:24px">
          <h2>Password Reset Request</h2>
          <p>Click below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;background:#FFD814;color:#131921;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Reset Password</a>
          <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `,
  })
}

export async function sendReturnUpdate(to: string, data: {
  returnNumber: string
  status: string
  refundAmount?: number
}) {
  if (!resend) {
    console.log('[EMAIL] Return update:', data.returnNumber, data.status)
    return
  }

  const statusMessages: Record<string, string> = {
    approved: 'Your return has been approved. Please ship the item back.',
    rejected: 'Unfortunately, your return request has been rejected.',
    completed: `Your refund of $${data.refundAmount?.toFixed(2)} has been processed.`,
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Return ${data.returnNumber} — ${data.status}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2>Return Request Update</h2>
        <p>Return #<strong>${data.returnNumber}</strong></p>
        <p>${statusMessages[data.status] || `Status updated to: ${data.status}`}</p>
        <a href="${process.env.NEXTAUTH_URL}/orders" style="display:inline-block;background:#FFD814;color:#131921;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">View Details</a>
      </div>
    `,
  })
}
