import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Primebazaar <noreply@primebazaar.store>'

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
