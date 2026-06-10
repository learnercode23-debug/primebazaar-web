export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import BrandApplication from '@/models/BrandApplication'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const status = new URL(req.url).searchParams.get('status')
    const query = status && ['pending', 'approved', 'rejected'].includes(status) ? { status } : {}
    const apps = await BrandApplication.find(query)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    return NextResponse.json({ data: apps })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { id, action, note } = await req.json()
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id and valid action required' }, { status: 400 })
    }
    const status = action === 'approve' ? 'approved' : 'rejected'
    const app = await BrandApplication.findByIdAndUpdate(
      id,
      { status, note: note || undefined, reviewedBy: user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('seller', 'name email')
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const sellerId = (app.seller as unknown as { _id: { toString(): string } })._id.toString()
    await createNotification(
      sellerId,
      'admin_alert',
      action === 'approve' ? `Brand "${app.brandName}" approved ✅` : `Brand "${app.brandName}" application rejected`,
      action === 'approve'
        ? `Your brand registry application was approved. You now have brand protection on PrimePasal.`
        : `Your brand registry application was not approved.${note ? ` Reason: ${note}` : ''}`,
      '/seller/brand-registry'
    )
    return NextResponse.json({ data: app })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
