// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/support/chat — start a new chat session (bot mode)
 * GET  /api/support/chat — get customer's active chat
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ChatSession from '@/models/ChatSession'
import HelpArticle from '@/models/HelpArticle'
import Order from '@/models/Order'
import SupportTicket from '@/models/SupportTicket'
import TicketMessage from '@/models/TicketMessage'
import User from '@/models/User'
import { createNotification } from '@/lib/notifications'

// The bot tells users to say "agent" in nearly every reply — this detects that intent
function wantsAgent(text: string): boolean {
  const lower = text.toLowerCase()
  return /\b(agent|human|real person|representative|customer care|support team)\b/.test(lower)
    || lower.includes('talk to a person')
    || lower.includes('talk to someone')
}

async function botReply(customerId: string, userMessage: string): Promise<string> {
  const lower = userMessage.toLowerCase()

  // Greeting
  if (/^(hi|hello|hey|namaste|namaskar|help)\b/.test(lower)) {
    return `Namaste! 🙏 I'm the PrimePasal support bot. I can help you with:\n\n• Order tracking & status\n• Returns & refunds\n• Payment issues (Khalti, eSewa, COD)\n• Cancellations\n• Account problems\n\nWhat do you need help with today?`
  }

  // Order tracking
  if (lower.includes('track') || lower.includes('where') || (lower.includes('order') && (lower.includes('status') || lower.includes('deliver') || lower.includes('arriv')))) {
    if (customerId) {
      const recentOrder = await Order.findOne({ user: customerId })
        .sort({ createdAt: -1 })
        .select('orderNumber status totalAmount createdAt')
        .lean()
      if (recentOrder) {
        const statusMsg: Record<string, string> = {
          pending:    'pending confirmation',
          confirmed:  'confirmed and being prepared',
          processing: 'being processed',
          shipped:    'shipped and on the way!',
          delivered:  'delivered',
          cancelled:  'cancelled',
        }
        const s = statusMsg[recentOrder.status] || recentOrder.status
        return `Your latest order **#${recentOrder.orderNumber}** (Rs.${recentOrder.totalAmount?.toLocaleString()}) is currently **${s}**.\n\nYou can view full tracking details in [My Orders](/orders). Need more help? Say **"agent"** to talk to our team.`
      }
    }
    return `To track your order:\n1. Go to **My Orders** in your account menu\n2. Click on the order to see full tracking details\n\nIf you're not logged in, please [sign in](/login) first. Still having trouble? Say **"agent"** and I'll connect you with support.`
  }

  // Return / refund
  if (lower.includes('return') || lower.includes('refund') || lower.includes('money back') || lower.includes('feri')) {
    return `**Return & Refund Policy:**\n\n✓ Returns accepted within **30 days** of delivery\n✓ Item must be unused and in original packaging\n✓ Refunds processed within **5-7 business days**\n\nTo request a return:\n1. Go to **My Orders**\n2. Click the order → **Request Return**\n\nFor refund to Khalti or eSewa wallet, it takes 2-3 days. For bank transfer, 5-7 days. Say **"agent"** if you need help with a specific order.`
  }

  // Khalti / eSewa payment
  if (lower.includes('khalti') || lower.includes('esewa') || lower.includes('e-sewa')) {
    return `**Khalti & eSewa Payments:**\n\nWe accept both Khalti and eSewa for instant payment.\n\n**If payment failed but money was deducted:**\n• Wait 24 hours — it usually reverses automatically\n• If not reversed, contact us with your transaction ID\n• Refund goes back to your Khalti/eSewa wallet\n\n**To pay with Khalti/eSewa:**\n1. Add items to cart\n2. Choose Khalti or eSewa at checkout\n3. Complete payment in the app\n\nNeed help? Say **"agent"** to connect with our payment team.`
  }

  // COD (Cash on Delivery)
  if (lower.includes('cod') || lower.includes('cash') || lower.includes('delivery payment') || lower.includes('cash on delivery')) {
    return `**Cash on Delivery (COD):**\n\n✓ Available in most areas of Nepal\n✓ Pay in cash when your order arrives\n✓ A verification code will be sent to your phone — share it with the delivery person\n\n**Important:** Please keep exact change ready. Our delivery partners may not carry change.\n\nIs COD not available for your area? Some remote locations require prepayment. Say **"agent"** for help.`
  }

  // Payment issues (general)
  if (lower.includes('payment') || lower.includes('pay') || lower.includes('charge') || lower.includes('deduct')) {
    return `**Payment Help:**\n\n• **Payment failed?** Try again with a different method or clear your browser cache\n• **Double charged?** This auto-corrects within 24 hours — contact us with your transaction ID if it doesn't\n• **Accepted methods:** Khalti, eSewa, COD, bank transfer\n\nIf your money was deducted but no order was placed, it will be **fully refunded within 5-7 business days**. Say **"agent"** and share your transaction ID for faster help.`
  }

  // Cancel order
  if (lower.includes('cancel')) {
    return `**Cancelling an Order:**\n\n✓ You can cancel **before it's shipped** from [My Orders](/orders)\n✗ Once shipped, cancellation is not possible — request a return instead after delivery\n\n**Steps to cancel:**\n1. Go to **My Orders**\n2. Click the order\n3. Select **Cancel Order**\n\nRefund (if prepaid) will be processed within 5-7 business days. Need help? Say **"agent"**.`
  }

  // Not received / missing item
  if (lower.includes('not received') || lower.includes('missing') || lower.includes('didn\'t receive') || lower.includes('pakaina') || lower.includes('aayena')) {
    return `**Order Not Received?**\n\nFirst, check the tracking status in [My Orders](/orders).\n\n**If it shows "Delivered" but you didn't receive it:**\n• Check with neighbors or building security\n• Look for a missed delivery notice\n• Contact us immediately — we'll investigate\n\n**If it shows "In Transit" past the expected date:**\n• Allow 1-2 extra business days\n• Check for any delivery alerts\n\nSay **"agent"** and I'll open a priority ticket for you right now.`
  }

  // Wrong item
  if (lower.includes('wrong') || lower.includes('incorrect') || lower.includes('different')) {
    return `**Received Wrong Item?**\n\nWe're sorry about that! Here's what to do:\n\n1. **Don't use or damage** the item\n2. Go to **My Orders → Request Return** and select "Wrong Item Received"\n3. Upload a photo of the item received\n4. We'll arrange pickup and send the correct item\n\nThis is fully covered — no extra charge. Say **"agent"** to escalate immediately and we'll prioritize your case.`
  }

  // Account / login / password
  if (lower.includes('account') || lower.includes('login') || lower.includes('password') || lower.includes('sign in') || lower.includes('forgot')) {
    return `**Account Help:**\n\n**Forgot password?**\n→ Go to [Login](/login) → Click "Forgot Password" → Check your email\n\n**Can't log in?**\n• Make sure your email is correct\n• Check caps lock\n• Try resetting your password\n\n**Email not verified?**\n→ Check your spam/junk folder\n\nStill stuck? Say **"agent"** and we'll help you regain access.`
  }

  // Seller / become a seller
  if (lower.includes('seller') || lower.includes('sell') || lower.includes('bech') || lower.includes('product add')) {
    return `**Become a Seller on PrimePasal:**\n\n✓ Free to register\n✓ Reach customers across Nepal\n✓ Easy product listing\n✓ Fast payout to Khalti/eSewa/bank\n\n**To get started:**\n1. [Register as a seller](/register?role=seller)\n2. Complete your shop profile\n3. Add your products\n4. Start selling!\n\nFor business accounts or bulk selling, say **"agent"** to talk to our seller support team.`
  }

  // Delivery time
  if (lower.includes('delivery time') || lower.includes('how long') || lower.includes('kati din') || lower.includes('when will')) {
    return `**Delivery Times:**\n\n📍 **Kathmandu Valley:** 1-2 business days\n📍 **Major cities** (Pokhara, Biratnagar, Butwal): 2-4 business days\n📍 **Other areas:** 4-7 business days\n\nDelivery times may vary during festivals (Dashain, Tihar) and bad weather. You'll receive SMS/notification when your order ships.\n\nCheck your specific order's estimated date in [My Orders](/orders).`
  }

  // Search articles — escape each keyword before building the alternation regex
  const keywords = userMessage.split(' ').filter(w => w.length > 3).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const articles = keywords.length === 0 ? [] : await HelpArticle.find({
    isPublished: true,
    $or: [
      { title: { $regex: keywords.join('|'), $options: 'i' } },
      { tags:  { $regex: keywords.join('|'), $options: 'i' } },
    ]
  }).select('title').limit(3).lean()

  if (articles.length > 0) {
    const list = articles.map(a => `• ${a.title}`).join('\n')
    return `I found some helpful articles:\n\n${list}\n\nYou can find these in our [Help Center](/support). Still need help? Say **"agent"** to talk to a person.`
  }

  return `I'm not sure I understand that completely. Here's what I can help with:\n\n• **Track order** — say "track my order"\n• **Return/refund** — say "I want a refund"\n• **Payment issue** — say "payment problem"\n• **Cancel order** — say "cancel my order"\n• **Khalti/eSewa** — say "khalti payment"\n\nOr say **"agent"** to connect with a human support agent right now.`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const session = await ChatSession.findOne({
      customer: user._id,
      status:   { $in: ['active', 'waiting_agent', 'with_agent'] },
    }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ success: true, data: session })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const user = await getAuthUser(req)

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 })

    const asksAgent = wantsAgent(message)

    // Guest users: run bot without saving session
    if (!user) {
      if (asksAgent) {
        return NextResponse.json({
          success: true,
          botReply: 'To connect with a human agent, please [sign in](/login) first so we can link the conversation to your account and orders. Once signed in, say **"agent"** again and I\'ll connect you right away.',
        })
      }
      const botResponse = await botReply('', message)
      return NextResponse.json({ success: true, botReply: botResponse })
    }

    // Logged-in users: persist chat session
    let session = await ChatSession.findOne({
      customer: user._id,
      status:   { $in: ['active', 'waiting_agent', 'with_agent'] },
    })

    // Session already escalated to a human — relay the message to the ticket, don't bot-reply
    if (session && session.mode === 'human') {
      session.messages.push({ sender: user._id, senderRole: 'customer', body: message, createdAt: new Date() })
      await session.save()
      if (session.ticket) {
        await TicketMessage.create({
          ticket:     session.ticket,
          sender:     user._id,
          senderRole: 'customer',
          body:       message,
        }).catch(console.error)
      }
      const holdReply = session.status === 'with_agent'
        ? 'Message delivered to your support agent — they\'ll reply here or on your [support ticket](/support).'
        : 'You\'re in the queue for a human agent. Your message has been added to your [support ticket](/support) and an agent will reply shortly.'
      return NextResponse.json({ success: true, data: session, botReply: holdReply })
    }

    // Customer asked for a human — escalate: create ticket from transcript + notify admins
    if (asksAgent) {
      if (!session) {
        session = await ChatSession.create({
          customer: user._id,
          mode:     'bot',
          status:   'active',
          messages: [{ sender: user._id, senderRole: 'customer', body: message, createdAt: new Date() }],
        })
      } else {
        session.messages.push({ sender: user._id, senderRole: 'customer', body: message, createdAt: new Date() })
      }

      const transcript = session.messages
        .map(m => `[${m.senderRole.toUpperCase()}]: ${m.body}`)
        .join('\n')

      const ticket = await SupportTicket.create({
        customer:    user._id,
        category:    'other',
        subject:     'Escalated from live chat',
        description: `Chat escalated to human agent.\n\n--- Chat Transcript ---\n${transcript}`,
        status:      'open',
        priority:    'high',
      })
      await TicketMessage.create({
        ticket:     ticket._id,
        sender:     user._id,
        senderRole: 'bot',
        body:       `Chat transcript:\n${transcript}`,
      }).catch(console.error)

      const confirmMsg = `I'm connecting you to a human agent now. 🧑‍💻\n\nSupport ticket **#${ticket.ticketNumber}** has been created — our team has been notified and will reply shortly. You can keep typing here or follow up in [My Tickets](/support).`

      session.status = 'waiting_agent'
      session.mode   = 'human'
      session.ticket = ticket._id
      session.messages.push({ sender: user._id, senderRole: 'bot', body: confirmMsg, createdAt: new Date() })
      await session.save()

      const admins = await User.find({ role: 'admin' }).select('_id').lean()
      for (const admin of admins) {
        await createNotification(
          admin._id.toString(),
          'admin_alert',
          'Chat Escalated — Agent Requested',
          `Customer needs human support. Ticket #${ticket.ticketNumber}`,
          `/support/tickets/${ticket._id}`
        ).catch(console.error)
      }

      return NextResponse.json({ success: true, data: session, botReply: confirmMsg })
    }

    const botResponse = await botReply(user._id.toString(), message)

    if (!session) {
      session = await ChatSession.create({
        customer: user._id,
        mode:     'bot',
        status:   'active',
        messages: [
          { sender: user._id, senderRole: 'customer', body: message, createdAt: new Date() },
          { sender: user._id, senderRole: 'bot',      body: botResponse, createdAt: new Date() },
        ],
      })
    } else {
      session.messages.push(
        { sender: user._id, senderRole: 'customer', body: message,     createdAt: new Date() },
        { sender: user._id, senderRole: 'bot',      body: botResponse, createdAt: new Date() },
      )
      await session.save()
    }

    return NextResponse.json({ success: true, data: session, botReply: botResponse })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
