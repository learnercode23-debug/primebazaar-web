// @ts-nocheck
/**
 * Order Splitting Engine
 *
 * Called immediately after a main Order is created.
 * Groups items by ASSIGNED seller (already resolved by assignmentEngine)
 * and creates one SubOrder per seller.
 *
 * Also writes an AssignmentLog entry for every sub-order for audit trail.
 */

import SubOrder from '@/models/SubOrder'
import AssignmentLog from '@/models/AssignmentLog'
import SLAConfig from '@/models/SLAConfig'

interface AssignmentMeta {
  rule:   string
  reason: string
}

export interface OrderItem {
  product:         { toString(): string }
  title:           string
  image:           string
  price:           number
  originalPrice?:  number
  quantity:        number
  seller:          { toString(): string }   // already the ASSIGNED seller
  sku?:            string
  variantLabel?:   string
  // Optional assignment metadata (per item, from assignmentEngine)
  assignmentRule?:   string
  assignmentReason?: string
}

export async function splitOrderBySeller(
  orderId: string,
  orderNumber: string,
  items: OrderItem[],
  shippingCostPerSeller = 0
): Promise<void> {

  // Group items by assigned seller
  const bySellerMap = new Map<string, { items: OrderItem[]; meta: AssignmentMeta }>()

  for (const item of items) {
    const sellerId = item.seller?.toString()
    if (!sellerId) continue

    if (!bySellerMap.has(sellerId)) {
      bySellerMap.set(sellerId, {
        items: [],
        meta: {
          rule:   item.assignmentRule   || 'primary_seller',
          reason: item.assignmentReason || 'Assigned at order placement',
        },
      })
    }
    bySellerMap.get(sellerId)!.items.push(item)
  }

  let index = 1
  const subOrderDocs: any[] = []

  for (const [sellerId, { items: sellerItems, meta }] of bySellerMap.entries()) {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const total    = subtotal + shippingCostPerSeller

    subOrderDocs.push({
      parentOrder:      orderId,
      subOrderNumber:   `${orderNumber}-S${index}`,
      seller:           sellerId,
      items: sellerItems.map((i) => ({
        product:       i.product,
        title:         i.title,
        image:         i.image || '',
        price:         i.price,
        originalPrice: i.originalPrice || i.price,
        quantity:      i.quantity,
        sku:           i.sku,
        variantLabel:  i.variantLabel,
      })),
      subtotal:         Math.round(subtotal * 100) / 100,
      shippingCost:     shippingCostPerSeller,
      totalAmount:      Math.round(total * 100) / 100,
      assignmentRule:   meta.rule,
      assignmentReason: meta.reason,
      status:           'confirmed',
      statusHistory:    [{ status: 'confirmed', timestamp: new Date(), note: 'Order placed by customer' }],
    })

    index++
  }

  if (subOrderDocs.length === 0) return

  // Load SLA config to set deadlines
  const sla = await SLAConfig.findOne().lean()
  const acceptHours = sla?.acceptHours ?? 24
  const shipDays    = sla?.shipDays    ?? 3
  const now         = new Date()
  const acceptDeadline = new Date(now.getTime() + acceptHours * 3600 * 1000)
  const shipDeadline   = new Date(now.getTime() + shipDays   * 86400 * 1000)

  // Stamp deadlines on every sub-order
  for (const doc of subOrderDocs) {
    doc.acceptDeadline = acceptDeadline
    doc.shipDeadline   = shipDeadline
    doc.slaStatus      = 'ok'
  }

  // Insert all sub-orders
  const created = await SubOrder.insertMany(subOrderDocs)

  // Write assignment log entries (fire-and-forget; don't block order creation)
  const logEntries = created.map((sub: any, i: number) => ({
    subOrder:    sub._id,
    order:       orderId,
    action:      'auto_assigned',
    fromSeller:  null,
    toSeller:    sub.seller,
    rule:        sub.assignmentRule,
    reason:      sub.assignmentReason,
    performedBy: null,
    timestamp:   new Date(),
  }))

  await AssignmentLog.insertMany(logEntries).catch(console.error)
}

/**
 * Derive parent order status from its sub-orders.
 * Used to keep the main Order status in sync when a sub-order changes.
 */
export function deriveParentStatus(subStatuses: string[]): string {
  if (subStatuses.length === 0)                          return 'confirmed'
  if (subStatuses.every((s) => s === 'delivered'))       return 'delivered'
  if (subStatuses.every((s) => s === 'cancelled'))       return 'cancelled'
  if (subStatuses.some((s)  => s === 'out_for_delivery'))return 'out_for_delivery'
  if (subStatuses.some((s)  => s === 'shipped'))         return 'shipped'
  if (subStatuses.some((s)  => s === 'packed'))          return 'processing'
  if (subStatuses.some((s)  => s === 'processing'))      return 'processing'
  return 'confirmed'
}
