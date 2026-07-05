export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import GiftCard from '@/models/GiftCard'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/utils'
import { stripe } from '@/lib/stripe'

function genCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PP-${part()}-${part()}`
}

async function uniqueCode() {
  for (let i = 0; i < 6; i++) {
    const code = genCode()
    const exists = await GiftCard.findOne({ code }).select('_id').lean()
    if (!exists) return code
  }
  return genCode() + '-' + Date.now().toString(36).toUpperCase()
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const cards = await GiftCard.find({ purchasedBy: user._id }).sort({ createdAt: -1 }).limit(50).lean()
    return NextResponse.json({ data: cards })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Please log in to buy a gift card' }, { status: 401 })
    await connectDB()
    const { amount, design, recipientName, recipientEmail, senderName, message, stripePaymentIntentId } = await req.json()

    const amt = Number(amount)
    if (!amt || amt < 100 || amt > 100000) return NextResponse.json({ error: 'Amount must be between Rs.100 and Rs.100,000' }, { status: 400 })
    if (!recipientName?.trim() || !recipientEmail?.trim() || !senderName?.trim()) {
      return NextResponse.json({ error: 'Recipient name, email and your name are required' }, { status: 400 })
    }

    // A gift card is real money — never mint balance without a verified payment.
    if (!stripePaymentIntentId) {
      return NextResponse.json({ error: 'Payment is required to purchase a gift card.' }, { status: 402 })
    }
    try {
      const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
      const amountMatches = intent.amount === Math.round(amt * 100)
      const ownerMatches = intent.metadata?.userId === user._id.toString()
      if (intent.status !== 'succeeded' || !amountMatches || !ownerMatches) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
      }
      // Reuse of the same payment for a second card is blocked by the unique index on GiftCard.paymentRef.
    } catch {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const code = await uniqueCode()
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    const card = await GiftCard.create({
      code,
      amount: amt,
      balance: amt,
      design: design || 'celebration',
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      senderName: senderName.trim(),
      message: message?.trim() || undefined,
      purchasedBy: user._id,
      paymentRef: stripePaymentIntentId,
      status: 'active',
      expiresAt,
    })

    // Email the recipient their gift card (best-effort). Escape user-supplied text.
    sendEmail(
      card.recipientEmail,
      `🎁 ${escapeHtml(card.senderName)} sent you a Rs.${amt.toLocaleString()} PrimePasal gift card!`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>You've received a gift card!</h2>
        <p><strong>${escapeHtml(card.senderName)}</strong> sent you a <strong>Rs.${amt.toLocaleString()}</strong> PrimePasal gift card.</p>
        ${card.message ? `<p style="font-style:italic;color:#555">"${escapeHtml(card.message)}"</p>` : ''}
        <div style="background:#7c3aed;color:#fff;padding:20px;border-radius:12px;text-align:center;margin:16px 0">
          <p style="margin:0;opacity:.8">Your code</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:2px;margin:6px 0">${card.code}</p>
        </div>
        <p>Redeem it at <a href="https://www.primepasal.com/gift-cards">primepasal.com/gift-cards</a> — it adds to your store credit and applies automatically at checkout.</p>
        <p style="color:#888;font-size:12px">Valid until ${expiresAt.toLocaleDateString()}.</p>
      </div>`
    ).catch(() => {})

    return NextResponse.json({ data: { code: card.code, amount: card.amount, design: card.design } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
