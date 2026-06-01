import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { amount } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      metadata: { userId: user._id.toString() },
    })

    return NextResponse.json({ success: true, clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Payment error' }, { status: 500 })
  }
}
