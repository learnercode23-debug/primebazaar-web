// @ts-nocheck
/**
 * Assignment Engine
 *
 * Decides WHICH seller gets each product in an order.
 *
 * Supported rules (configurable from admin dashboard):
 *   lowest_price   — pick seller offering the cheapest price
 *   highest_rating — pick seller whose products have the best avg review rating
 *   round_robin    — rotate fairly: always pick the seller with the fewest turns
 *   nearest        — placeholder (falls back to lowest_price until GPS coords added)
 *
 * If only ONE seller stocks the product, it's auto-assigned without applying any rule.
 * If NO SellerInventory record exists, the product's primary seller is used.
 */

import SellerInventory from '@/models/SellerInventory'
import AssignmentConfig from '@/models/AssignmentConfig'
import Product from '@/models/Product'
import User from '@/models/User'

export interface AssignmentResult {
  sellerId:   string
  sellerName: string
  rule:       string  // which rule was applied
  reason:     string  // human-readable explanation (stored in DB for transparency)
  price:      number  // the price from this seller's inventory (0 if primary seller)
}

/**
 * Main entry point. Call once per unique product in a cart.
 *
 * @param productId       MongoDB ObjectId string of the product
 * @param primarySellerId The product's creator/owner seller
 * @param quantity        Units ordered (used to filter sellers with enough stock)
 */
export async function assignProductSeller(
  productId: string,
  primarySellerId: string,
  quantity: number
): Promise<AssignmentResult> {

  // 1. Find all active sellers who have enough stock for this product
  const inventories = await SellerInventory.find({
    product:  productId,
    isActive: true,
    stock:    { $gte: quantity },
  })
    .populate('seller', 'name')
    .lean()

  // No multi-seller inventory → use the product's primary seller
  if (!inventories || inventories.length === 0) {
    const primary = await User.findById(primarySellerId).select('name').lean()
    return {
      sellerId:   primarySellerId,
      sellerName: primary?.name || 'Unknown Seller',
      rule:       'primary_seller',
      reason:     'No multi-seller inventory; using product owner',
      price:      0,
    }
  }

  // Only one eligible seller → auto-assign without wasting a rule call
  if (inventories.length === 1) {
    const inv = inventories[0]
    return {
      sellerId:   inv.seller._id.toString(),
      sellerName: inv.seller.name,
      rule:       'auto_only_one',
      reason:     'Only one eligible seller has sufficient stock',
      price:      inv.price,
    }
  }

  // Multiple eligible sellers → apply configured rule
  const config = await AssignmentConfig.findOne().lean()
  const rule   = config?.rule || 'lowest_price'

  return applyRule(rule, inventories, productId)
}

/* ─────────────────────────────────────────────────────────
   Rule implementations
   ───────────────────────────────────────────────────────── */

async function applyRule(
  rule: string,
  inventories: any[],
  productId: string
): Promise<AssignmentResult> {
  switch (rule) {

    /* ── Lowest price ── */
    case 'lowest_price': {
      const sorted = [...inventories].sort((a, b) => a.price - b.price)
      const winner = sorted[0]
      return {
        sellerId:   winner.seller._id.toString(),
        sellerName: winner.seller.name,
        rule:       'lowest_price',
        reason:     `Lowest-price rule: selected seller at Rs.${winner.price.toLocaleString()}`,
        price:      winner.price,
      }
    }

    /* ── Highest seller rating (avg product rating as proxy) ── */
    case 'highest_rating': {
      // Compute average product rating per seller
      const sellerIds = inventories.map((inv) => inv.seller._id)
      const ratings   = await Product.aggregate([
        { $match: { seller: { $in: sellerIds }, isApproved: true } },
        { $group: { _id: '$seller', avgRating: { $avg: '$rating' } } },
      ])

      const ratingMap: Record<string, number> = {}
      for (const r of ratings) ratingMap[r._id.toString()] = r.avgRating || 0

      const sorted = [...inventories].sort(
        (a, b) =>
          (ratingMap[b.seller._id.toString()] || 0) -
          (ratingMap[a.seller._id.toString()] || 0)
      )
      const winner     = sorted[0]
      const winnerRating = ratingMap[winner.seller._id.toString()] || 0

      return {
        sellerId:   winner.seller._id.toString(),
        sellerName: winner.seller.name,
        rule:       'highest_rating',
        reason:     `Highest-rating rule: ${winner.seller.name} (avg ${winnerRating.toFixed(1)} ★)`,
        price:      winner.price,
      }
    }

    /* ── Round-robin: pick seller with fewest assignments so far ── */
    case 'round_robin': {
      const sorted = [...inventories].sort(
        (a, b) => (a.roundRobinCounter || 0) - (b.roundRobinCounter || 0)
      )
      const winner = sorted[0]

      // Increment counter asynchronously (non-blocking)
      SellerInventory.findOneAndUpdate(
        { product: winner.product, seller: winner.seller._id },
        { $inc: { roundRobinCounter: 1 } }
      ).exec().catch(console.error)

      return {
        sellerId:   winner.seller._id.toString(),
        sellerName: winner.seller.name,
        rule:       'round_robin',
        reason:     `Round-robin rule: ${winner.seller.name}'s turn (counter: ${winner.roundRobinCounter || 0})`,
        price:      winner.price,
      }
    }

    /* ── Nearest seller (GPS not yet integrated — falls back to lowest price) ── */
    case 'nearest': {
      const sorted = [...inventories].sort((a, b) => a.price - b.price)
      const winner = sorted[0]
      return {
        sellerId:   winner.seller._id.toString(),
        sellerName: winner.seller.name,
        rule:       'nearest',
        reason:     `Nearest-seller rule (approximated by price; full GPS pending)`,
        price:      winner.price,
      }
    }

    /* ── Default fallback ── */
    default: {
      const winner = inventories[0]
      return {
        sellerId:   winner.seller._id.toString(),
        sellerName: winner.seller.name,
        rule:       'default',
        reason:     'Default assignment: first eligible seller',
        price:      winner.price,
      }
    }
  }
}
