// @ts-nocheck
/**
 * Order Splitting Engine
 *
 * Called immediately after a main Order is created.
 * Groups items by seller and creates one SubOrder per seller.
 *
 * Example:
 *   Cart: [Phone (TechWorld), Case (TechWorld), Book (HomePro)]
 *   → SubOrder-1: TechWorld — Phone + Case
 *   → SubOrder-2: HomePro   — Book
 */

import SubOrder from '@/models/SubOrder'

interface OrderItem {
  product: { toString(): string }
  title: string
  image: string
  price: number
  originalPrice: number
  quantity: number
  seller: { toString(): string }
  sku?: string
  variantLabel?: string
}

export async function splitOrderBySeller(
  orderId: string,
  orderNumber: string,
  items: OrderItem[],
  shippingCostPerSeller = 0
): Promise<void> {
  // Group items by seller
  const bySellerMap = new Map<string, OrderItem[]>()

  for (const item of items) {
    const sellerId = item.seller?.toString()
    if (!sellerId) continue
    if (!bySellerMap.has(sellerId)) bySellerMap.set(sellerId, [])
    bySellerMap.get(sellerId)!.push(item)
  }

  let index = 1
  const subOrders = []

  for (const [sellerId, sellerItems] of bySellerMap.entries()) {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const total    = subtotal + shippingCostPerSeller

    subOrders.push({
      parentOrder:    orderId,
      subOrderNumber: `${orderNumber}-S${index}`,
      seller:         sellerId,
      items: sellerItems.map((i) => ({
        product:       i.product,
        title:         i.title,
        image:         i.image || '',
        price:         i.price,
        originalPrice: i.originalPrice,
        quantity:      i.quantity,
        sku:           i.sku,
        variantLabel:  i.variantLabel,
      })),
      subtotal:     Math.round(subtotal * 100) / 100,
      shippingCost: shippingCostPerSeller,
      totalAmount:  Math.round(total * 100) / 100,
      status:       'confirmed',
      statusHistory: [{ status: 'confirmed', timestamp: new Date(), note: 'Order placed by customer' }],
    })

    index++
  }

  if (subOrders.length > 0) {
    await SubOrder.insertMany(subOrders)
  }
}

/**
 * Derive parent order status from its sub-orders.
 * Used to keep the main Order status in sync.
 */
export function deriveParentStatus(subStatuses: string[]): string {
  if (subStatuses.length === 0) return 'confirmed'
  if (subStatuses.every((s) => s === 'delivered'))  return 'delivered'
  if (subStatuses.every((s) => s === 'cancelled'))  return 'cancelled'
  if (subStatuses.some((s)  => s === 'shipped'))    return 'partially_shipped'
  if (subStatuses.some((s)  => s === 'processing')) return 'processing'
  return 'confirmed'
}
