// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/seed/support
 * Seeds demo help articles, a sample ticket, and a chat session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import HelpArticle from '@/models/HelpArticle'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import ChatSession from '@/models/ChatSession'
import User from '@/models/User'
import Order from '@/models/Order'

const ARTICLES = [
  { title: 'How to track my order', category: 'orders', body: '## Track Your Order\n\nGo to **My Orders** and click on any order to see its current status and tracking information.\n\n**Order Statuses:**\n- Confirmed: Order placed successfully\n- Processing: Seller is preparing your order\n- Shipped: Order is on its way\n- Delivered: Order has arrived\n\nFor COD orders, the delivery agent will call you before arriving.', tags: ['track', 'order', 'status', 'shipping'] },
  { title: 'How to cancel an order', category: 'orders', body: '## Cancel an Order\n\nYou can cancel an order **before it is shipped**:\n1. Go to **My Orders**\n2. Click on the order\n3. Click **Cancel Order**\n4. Select a reason\n\nOnce shipped, cancellation is not possible — you will need to request a return after delivery.', tags: ['cancel', 'order'] },
  { title: 'Returns and refunds policy', category: 'returns', body: '## Return Policy\n\n- **Return window**: 30 days from delivery\n- **Condition**: Item must be unused and in original packaging\n- **Refund**: Processed within 5–7 business days\n\n**How to request a return:**\n1. Go to My Orders\n2. Select the order\n3. Click Return/Refund\n4. Fill in the reason and submit\n\nAn agent will review your request within 24 hours.', tags: ['return', 'refund', 'policy'] },
  { title: 'Payment methods accepted', category: 'payments', body: '## Accepted Payments\n\n- **Khalti** — Nepal digital wallet\n- **eSewa** — Nepal digital wallet\n- **Cash on Delivery (COD)** — Pay at your door\n- **Credit/Debit Card** — Visa, MasterCard\n\n## Payment Issues\n\nIf money was deducted but the order was not placed, the amount will be automatically refunded within 5–7 business days.', tags: ['payment', 'khalti', 'esewa', 'cod', 'card'] },
  { title: 'COD order verification code', category: 'orders', body: '## Cash on Delivery Verification\n\nWhen your COD order is shipped, a **5-digit code** appears on your order page.\n\n1. Go to **My Orders → View Order**\n2. Note the 5-digit code shown in the yellow box\n3. When the delivery agent arrives, **read this code to them**\n4. They enter the code to confirm delivery and collect cash\n\nThe code expires after 24 hours — you can regenerate it from the order page.', tags: ['cod', 'delivery', 'otp', 'code', 'verification'] },
  { title: 'How to change my password', category: 'account', body: '## Change Your Password\n\n1. Go to **My Account → Profile**\n2. Click **Edit Profile**\n\nOr if you forgot your password:\n1. Go to the **Login page**\n2. Click **Forgot Password**\n3. Enter your email\n4. Check your inbox for a 6-digit OTP\n5. Enter the OTP to set a new password', tags: ['password', 'account', 'forgot', 'reset'] },
  { title: 'How to become a seller', category: 'account', body: '## Sell on Primepasal\n\n1. Create an account and select **Seller** as your role\n2. Add your products from the **Seller Hub**\n3. Wait for admin approval (usually within 24 hours)\n4. Once approved, your products are live!\n\n**Seller payouts:** We process payouts weekly after deducting a 10% commission.', tags: ['seller', 'sell', 'account', 'payout'] },
]

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    // Seed help articles
    let articlesCreated = 0
    for (const article of ARTICLES) {
      const exists = await HelpArticle.findOne({ title: article.title })
      if (!exists) {
        await HelpArticle.create({ ...article, createdBy: admin._id, isPublished: true })
        articlesCreated++
      }
    }

    // Find a customer to create a demo ticket
    const customer = await User.findOne({ role: 'customer' }).lean()
    const order    = customer ? await Order.findOne({ user: customer._id }).lean() : null

    let ticket = null
    if (customer) {
      ticket = await SupportTicket.create({
        customer:    customer._id,
        order:       order?._id,
        category:    'order',
        subject:     'Where is my order?',
        description: 'I placed an order 3 days ago and it still shows "Processing". Can you update me?',
        status:      'open',
        priority:    'medium',
      })
      await TicketMessage.create({
        ticket:     ticket._id,
        sender:     customer._id,
        senderRole: 'customer',
        body:       'I placed an order 3 days ago and it still shows "Processing". Can you update me?',
      })

      // Demo chat session
      await ChatSession.create({
        customer: customer._id,
        mode:     'bot',
        status:   'closed',
        messages: [
          { sender: customer._id, senderRole: 'customer', body: 'How do I track my order?', createdAt: new Date(Date.now() - 3600000) },
          { sender: customer._id, senderRole: 'bot',      body: 'You can track your order from **My Orders** page. Click on any order to see its current status.', createdAt: new Date(Date.now() - 3590000) },
        ],
      })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${articlesCreated} help articles + 1 demo ticket`,
      ticket:  ticket ? { id: ticket._id, number: ticket.ticketNumber } : null,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
