/**
 * Apriori-based Market Basket Analysis
 *
 * Amazon's approach: Association Rule Mining on transaction (order) data.
 *
 * Key metrics:
 *  support(A,B)    = |transactions with A and B| / |all transactions|
 *  confidence(A→B) = |transactions with A and B| / |transactions with A|
 *  lift(A→B)       = confidence(A→B) / support(B)
 *
 * Lift interpretation:
 *   lift > 1  → buying A increases probability of buying B (positive association)
 *   lift = 1  → A and B are independent
 *   lift < 1  → buying A decreases probability of buying B (substitutes)
 *
 * We use pairwise Apriori (2-itemsets) which matches Amazon's primary FBT signal.
 */

import { connectDB } from './mongodb'
import Order from '@/models/Order'
import AssociationRule from '@/models/AssociationRule'
import { cacheDelPattern } from './redis'

export interface MiningResult {
  rulesGenerated: number
  rulesUpdated: number
  totalOrdersProcessed: number
  uniqueProducts: number
  durationMs: number
}

export interface AprioriConfig {
  /** Minimum support: fraction of orders containing the pair (default 0.01 = 1%) */
  minSupport?: number
  /** Minimum confidence: P(B|A), default 0.05 = 5% */
  minConfidence?: number
  /** Minimum lift: must be > 1 to indicate positive association (default 1.2) */
  minLift?: number
  /** Only consider orders with payment status 'paid' */
  paidOnly?: boolean
}

/**
 * Run the full Apriori mining pass and persist results to MongoDB.
 * Call from admin panel or on a schedule.
 */
export async function runAprioriMining(config: AprioriConfig = {}): Promise<MiningResult> {
  const {
    minSupport = 0.01,
    minConfidence = 0.05,
    minLift = 1.2,
    paidOnly = true,
  } = config

  const t0 = Date.now()
  await connectDB()

  // ── Step 1: Load all transactions ────────────────────────────────────────
  const query = paidOnly ? { paymentStatus: 'paid' } : {}
  const orders = await Order.find(query).select('items.product').lean()
  const totalOrders = orders.length

  if (totalOrders === 0) {
    return { rulesGenerated: 0, rulesUpdated: 0, totalOrdersProcessed: 0, uniqueProducts: 0, durationMs: Date.now() - t0 }
  }

  // Convert to array of product-id sets per order (de-duplicate within order)
  const transactions: string[][] = orders.map((order) =>
    Array.from(new Set(
      (order.items as Array<{ product: { toString: () => string } }>)
        .map((i) => i.product.toString())
    ))
  )

  // ── Step 2: Count 1-itemsets (individual product frequencies) ────────────
  const itemCount = new Map<string, number>()
  for (const tx of transactions) {
    for (const item of tx) {
      itemCount.set(item, (itemCount.get(item) || 0) + 1)
    }
  }

  // Prune items below minimum support threshold
  const minSupportCount = Math.ceil(minSupport * totalOrders)
  const frequentItems = new Set(
    Array.from(itemCount.entries())
      .filter(([, cnt]) => cnt >= minSupportCount)
      .map(([id]) => id)
  )

  const uniqueProducts = frequentItems.size

  // ── Step 3: Count 2-itemsets (pairs) ─────────────────────────────────────
  const pairCount = new Map<string, number>()

  for (const tx of transactions) {
    // Filter to frequent items only
    const items = tx.filter((id) => frequentItems.has(id))
    // Generate all pairs within this transaction
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        // Canonical key: always smaller id first for symmetry
        const key = items[i] < items[j]
          ? `${items[i]}|${items[j]}`
          : `${items[j]}|${items[i]}`
        pairCount.set(key, (pairCount.get(key) || 0) + 1)
      }
    }
  }

  // ── Step 4: Generate association rules from frequent pairs ────────────────
  const rules: Array<{
    antecedent: string
    consequent: string
    support: number
    confidence: number
    lift: number
    coCount: number
    antecedentCount: number
  }> = []

  for (const [pairKey, coCount] of Array.from(pairCount)) {
    const support = coCount / totalOrders
    if (support < minSupport) continue

    const [a, b] = pairKey.split('|')
    const cntA = itemCount.get(a) || 0
    const cntB = itemCount.get(b) || 0

    // Rule A → B
    const confAB = cntA > 0 ? coCount / cntA : 0
    const liftAB = cntB > 0 ? confAB / (cntB / totalOrders) : 0
    if (confAB >= minConfidence && liftAB >= minLift) {
      rules.push({ antecedent: a, consequent: b, support, confidence: confAB, lift: liftAB, coCount, antecedentCount: cntA })
    }

    // Rule B → A
    const confBA = cntB > 0 ? coCount / cntB : 0
    const liftBA = cntA > 0 ? confBA / (cntA / totalOrders) : 0
    if (confBA >= minConfidence && liftBA >= minLift) {
      rules.push({ antecedent: b, consequent: a, support, confidence: confBA, lift: liftBA, coCount, antecedentCount: cntB })
    }
  }

  // ── Step 5: Upsert rules into MongoDB ────────────────────────────────────
  let rulesGenerated = 0
  let rulesUpdated = 0

  for (const rule of rules) {
    const result = await AssociationRule.updateOne(
      { antecedent: rule.antecedent, consequent: rule.consequent },
      {
        $set: {
          support: rule.support,
          confidence: rule.confidence,
          lift: rule.lift,
          coCount: rule.coCount,
          antecedentCount: rule.antecedentCount,
          totalOrders,
          minedAt: new Date(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) rulesGenerated++
    else rulesUpdated++
  }

  // Invalidate recommendation cache so stale results aren't served
  await cacheDelPattern('fbt:*')
  await cacheDelPattern('recommendations:*')

  return {
    rulesGenerated,
    rulesUpdated,
    totalOrdersProcessed: totalOrders,
    uniqueProducts,
    durationMs: Date.now() - t0,
  }
}

/**
 * Get frequently-bought-together products for a given product ID.
 * Returns up to `limit` consequents ranked by lift × confidence.
 */
export async function getFrequentlyBought(
  productId: string,
  limit = 3
): Promise<Array<{ productId: string; confidence: number; lift: number; support: number; coCount: number }>> {
  await connectDB()

  const rules = await AssociationRule.find({ antecedent: productId })
    .sort({ lift: -1, confidence: -1 })
    .limit(limit)
    .lean()

  return rules.map((r) => ({
    productId: r.consequent.toString(),
    confidence: r.confidence,
    lift: r.lift,
    support: r.support,
    coCount: r.coCount,
  }))
}
