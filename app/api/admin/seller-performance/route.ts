// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/seller-performance
 * Returns performance metrics for all sellers, sorted by overallScore desc.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerPerformance from '@/models/SellerPerformance'
import SubOrder from '@/models/SubOrder'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    // Get all sellers
    const sellers = await User.find({ role: 'seller', isActive: true }).select('name email').lean()

    // For each seller, get or compute performance
    const results = await Promise.all(sellers.map(async (seller) => {
      let perf = await SellerPerformance.findOne({ seller: seller._id }).lean()

      if (!perf) {
        // Compute from scratch if no cached record exists yet
        const subs = await SubOrder.find({ seller: seller._id }).select('status acceptDeadline shipDeadline acceptedAt shippedAt').lean()

        const totalAssigned  = subs.length
        let acceptedOnTime = 0, acceptedLate = 0, shippedOnTime = 0, shippedLate = 0
        let cancelled = 0, delivered = 0

        for (const s of subs) {
          if (s.status === 'cancelled') cancelled++
          if (s.status === 'delivered') delivered++
          if (s.acceptedAt) {
            const onTime = s.acceptDeadline ? s.acceptedAt <= s.acceptDeadline : true
            if (onTime) acceptedOnTime++; else acceptedLate++
          }
          if (s.shippedAt) {
            const onTime = s.shipDeadline ? s.shippedAt <= s.shipDeadline : true
            if (onTime) shippedOnTime++; else shippedLate++
          }
        }

        const t = totalAssigned || 1
        const acceptanceRate   = (acceptedOnTime + acceptedLate) / t
        const shipped = shippedOnTime + shippedLate
        const onTimeShipRate   = shipped > 0 ? shippedOnTime / shipped : 1
        const cancellationRate = cancelled / t
        const overallScore     = Math.round(acceptanceRate * 30 + onTimeShipRate * 40 + (1 - cancellationRate) * 30)

        perf = { seller: seller._id, totalAssigned, acceptedOnTime, acceptedLate,
                 shippedOnTime, shippedLate, cancelled, delivered,
                 acceptanceRate, onTimeShipRate, cancellationRate, overallScore, lastUpdated: new Date() } as typeof perf
      }

      return { ...perf, sellerName: seller.name, sellerEmail: seller.email }
    }))

    results.sort((a, b) => (b?.overallScore ?? 0) - (a?.overallScore ?? 0))

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('Seller performance error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
