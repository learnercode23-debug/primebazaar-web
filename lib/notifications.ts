import { connectDB } from './mongodb'
import Notification from '@/models/Notification'
import type { NotificationType } from '@/models/Notification'
import mongoose from 'mongoose'
import { emitToUser } from './socket-server'
import { sendExpoPush } from './push'

export async function createNotification(
  userId: string | mongoose.Types.ObjectId,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, string>
) {
  try {
    await connectDB()
    await Notification.create({ user: userId, type, title, message, link, metadata })

    const uid = userId.toString()
    // 1. Real-time socket push — instant update for open browser/app tabs
    emitToUser(uid, 'notification:new', { type, title })
    // 2. Expo push — works even when the app is closed or backgrounded
    sendExpoPush(uid, title, message).catch(console.error)
  } catch {
    // notifications are non-critical — never fail silently
    console.error('[Notification] Failed to create:', type, userId)
  }
}

export async function notifyOrderPlaced(userId: string, orderNumber: string, orderId: string) {
  await createNotification(
    userId,
    'order_placed',
    'Order placed successfully!',
    `Your order ${orderNumber} has been placed and is being processed.`,
    `/orders/${orderId}`
  )
}

export async function notifyOrderShipped(userId: string, orderNumber: string, orderId: string, trackingNumber: string) {
  await createNotification(
    userId,
    'order_shipped',
    'Your order has shipped!',
    `${orderNumber} is on its way. Tracking: ${trackingNumber}`,
    `/orders/${orderId}`
  )
}

/**
 * Notify every unique seller in an order that a new order has arrived.
 * Called from all 4 order-creation routes so sellers always get alerted.
 */
export async function notifySellerNewOrder(
  orderItems: Array<{ seller: string | mongoose.Types.ObjectId; title: string }>,
  orderNumber: string,
  orderId: string,
  customerName: string
) {
  // Deduplicate sellers — one notification per seller even if they have multiple items
  const sellerIds = Array.from(new Set(orderItems.map((i) => i.seller.toString())))
  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const sellerItems = orderItems.filter((i) => i.seller.toString() === sellerId)
      const itemSummary = sellerItems.map((i) => i.title).join(', ')
      // createNotification already emits notification:new + Expo push
      await createNotification(
        sellerId,
        'seller_new_order',
        `🛒 New Order — ${orderNumber}`,
        `${customerName} ordered: ${itemSummary.slice(0, 100)}${itemSummary.length > 100 ? '…' : ''}`,
        `/seller/orders`
      )
      // Also emit a specific order:new event so the seller's order list refreshes instantly
      emitToUser(sellerId, 'order:new', { orderId, orderNumber })
    })
  )
}

export async function notifyReturnUpdate(userId: string, returnNumber: string, status: string, returnId: string) {
  const messages: Record<string, string> = {
    approved: 'Return approved. Please ship the item back.',
    rejected: 'Return request was not approved. Check details for more info.',
    completed: 'Refund has been processed successfully.',
  }
  await createNotification(
    userId,
    status === 'approved' ? 'return_approved' : 'return_rejected',
    `Return ${returnNumber} ${status}`,
    messages[status] || `Return status: ${status}`,
    `/orders`
  )
}
