// @ts-nocheck
/**
 * Commission Engine
 *
 * Resolves the correct commission rate for a product sale using
 * the priority chain: product → category → seller → global → category default.
 *
 * Called by the settlement system when creating ledger entries.
 * Stores rateApplied on SellerLedger so historical records stay correct
 * even if rates change later.
 */

import CommissionRule from '@/models/CommissionRule'
import Category from '@/models/Category'

interface ResolvedRate {
  rate:      number   // the percentage or fixed amount
  rateType:  'percentage' | 'fixed'
  scope:     string   // which scope matched (for transparency)
}

/**
 * Find an active CommissionRule for a given scope + refId.
 */
async function findActiveRule(scope: string, refId?: string): Promise<ResolvedRate | null> {
  const now = new Date()
  const query: Record<string, unknown> = {
    scope,
    isActive: true,
    $or: [{ activeFrom: null }, { activeFrom: { $lte: now } }],
    $and: [{ $or: [{ activeTo: null }, { activeTo: { $gte: now } }] }],
  }
  if (refId) query.refId = refId

  const rule = await CommissionRule.findOne(query).lean()
  if (!rule) return null

  return {
    rate:     rule.rateValue,
    rateType: rule.rateType,
    scope,
  }
}

/**
 * Resolve commission rate using the priority chain:
 *   product → category → seller → global → Category.commission fallback → 10%
 */
export async function resolveCommissionRate(
  productId:  string,
  categoryId: string | null,
  sellerId:   string
): Promise<ResolvedRate> {

  // 1. Product-specific rule
  const productRule = await findActiveRule('product', productId)
  if (productRule) return productRule

  // 2. Category rule
  if (categoryId) {
    const catRule = await findActiveRule('category', categoryId)
    if (catRule) return catRule
  }

  // 3. Seller rule
  const sellerRule = await findActiveRule('seller', sellerId)
  if (sellerRule) return sellerRule

  // 4. Global rule
  const globalRule = await findActiveRule('global')
  if (globalRule) return globalRule

  // 5. Fallback: Category.commission or hardcoded 10%
  let fallbackRate = 10
  if (categoryId) {
    const cat = await Category.findById(categoryId).select('commission').lean()
    if (cat?.commission) fallbackRate = cat.commission
  }

  return { rate: fallbackRate, rateType: 'percentage', scope: 'category_default' }
}

/**
 * Calculate commission amount from a sale.
 */
export function calculateCommission(
  lineTotal: number,
  quantity:  number,
  resolved:  ResolvedRate
): number {
  if (resolved.rateType === 'fixed') {
    return Math.round(resolved.rate * quantity * 100) / 100
  }
  // percentage
  return Math.round(lineTotal * resolved.rate / 100 * 100) / 100
}
