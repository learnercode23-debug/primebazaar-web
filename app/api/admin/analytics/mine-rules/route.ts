export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { runAprioriMining } from '@/lib/apriori'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      minSupport = 0.01,
      minConfidence = 0.05,
      minLift = 1.2,
      paidOnly = true,
    } = body

    console.log('[Apriori] Mining started by admin:', user.email)

    const result = await runAprioriMining({ minSupport, minConfidence, minLift, paidOnly })

    console.log('[Apriori] Mining completed:', result)

    return NextResponse.json({
      success: true,
      message: `Mining complete — ${result.rulesGenerated} new rules, ${result.rulesUpdated} updated`,
      data: result,
    })
  } catch (err) {
    console.error('[Apriori] Mining error:', err)
    return NextResponse.json({ success: false, error: 'Mining failed' }, { status: 500 })
  }
}

// Allow GET to see current rule stats without re-mining
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { connectDB } = await import('@/lib/mongodb')
    const AssociationRule = (await import('@/models/AssociationRule')).default
    await connectDB()

    const [total, topRules, lastMined] = await Promise.all([
      AssociationRule.countDocuments(),
      AssociationRule.find()
        .sort({ lift: -1 })
        .limit(10)
        .populate('antecedent', 'title')
        .populate('consequent', 'title')
        .lean(),
      AssociationRule.findOne().sort({ minedAt: -1 }).select('minedAt totalOrders').lean(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalRules: total,
        lastMined: (lastMined as unknown as { minedAt?: Date })?.minedAt,
        totalOrdersAtMining: (lastMined as unknown as { totalOrders?: number })?.totalOrders,
        topRules: topRules.map((r) => ({
          antecedent: (r.antecedent as { title: string }).title,
          consequent: (r.consequent as { title: string }).title,
          support: (r.support * 100).toFixed(1) + '%',
          confidence: (r.confidence * 100).toFixed(1) + '%',
          lift: r.lift.toFixed(2),
          coCount: r.coCount,
        })),
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
