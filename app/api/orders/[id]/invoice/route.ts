export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import { formatPrice } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const order = await Order.findById(params.id).populate('user', 'name email').lean() as Record<string, unknown> | null
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const orderUser = order.user as { _id: { toString: () => string }; name: string; email: string }
    if (orderUser._id.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ success: false, error: 'Invoice is only available after delivery is confirmed.' }, { status: 403 })
    }

    const items = order.items as Array<{ title: string; quantity: number; price: number; variantLabel?: string; image: string }>
    const address = order.shippingAddress as { name: string; street: string; city: string; state: string; zipCode: string; country: string }

    const codFeeVal = (order.codFee as number) || 0

    // Generate HTML invoice — print-to-PDF friendly
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${order.invoiceNumber || order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #131921; padding-bottom: 20px; }
    .brand { font-size: 28px; font-weight: bold; color: #131921; }
    .brand span { color: #FFD814; }
    .invoice-title { font-size: 14px; color: #666; text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; }
    .section { margin: 24px 0; }
    .section-title { font-size: 13px; text-transform: uppercase; color: #666; letter-spacing: 1px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .total-row { font-weight: bold; font-size: 15px; background: #131921; color: white; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
    .print-btn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #131921; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: bold; }
    @media print {
      .print-btn { display: none !important; }
      body { padding: 20px; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="header">
    <div>
      <div class="brand">primepasal<span>.</span></div>
      <div style="font-size:12px;color:#666;margin-top:4px">primepasal.com</div>
    </div>
    <div class="invoice-title">
      <div>INVOICE</div>
      <div class="invoice-number">${order.invoiceNumber || order.orderNumber}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Date: ${new Date(order.createdAt as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div class="section">
      <div class="section-title">Billed To</div>
      <strong>${orderUser.name}</strong><br/>
      ${orderUser.email}
    </div>
    <div class="section">
      <div class="section-title">Ship To</div>
      <strong>${address.name}</strong><br/>
      ${address.street}<br/>
      ${address.city}, ${address.state} ${address.zipCode}<br/>
      ${address.country}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Details</div>
    <table>
      <thead>
        <tr>
          <th style="width:50%">Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.title}${item.variantLabel ? `<br/><span style="color:#666;font-size:12px">${item.variantLabel}</span>` : ''}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatPrice(item.price)}</td>
          <td style="text-align:right">${formatPrice(item.price * item.quantity)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr><td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px">Subtotal</td><td style="text-align:right;padding:8px 12px">${formatPrice(order.subtotal as number)}</td></tr>
        <tr><td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px">Shipping</td><td style="text-align:right;padding:8px 12px">${order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost as number)}</td></tr>
        ${codFeeVal > 0 ? `<tr><td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px">COD Handling Fee</td><td style="text-align:right;padding:8px 12px">${formatPrice(codFeeVal)}</td></tr>` : ''}
        ${(order.tax as number) > 0 ? `<tr><td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px">Tax</td><td style="text-align:right;padding:8px 12px">${formatPrice(order.tax as number)}</td></tr>` : ''}
        ${(order.discount as number) > 0 ? `<tr><td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px;color:green">Discount</td><td style="text-align:right;padding:8px 12px;color:green">-${formatPrice(order.discount as number)}</td></tr>` : ''}
        <tr class="total-row"><td colspan="3" style="text-align:right;padding:10px 12px">TOTAL</td><td style="text-align:right;padding:10px 12px">${formatPrice(order.totalAmount as number)}</td></tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">
    Thank you for shopping with Primepasal! For questions, contact support@primepasal.com
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.html"`,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
