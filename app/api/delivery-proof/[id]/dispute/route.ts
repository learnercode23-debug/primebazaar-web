// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * PATCH /api/delivery-proof/:id/dispute
 * Seller or Admin disputes the delivery proof.
 * Body: { reason: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import DeliveryProof from '@/models/DeliveryProof'
import Order from '@/models/Order'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const proof = await DeliveryProof.findById(params.id)
    if (!proof) return NextResponse.json({ error: 'Proof not found' }, { status: 404 })

    const order = await Order.findById(proof.order).select('items')
    const isSeller = order?.items?.some(i => i.seller?.toString() === user._id.toString())
    if (!isSeller && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the order seller or admin can dispute' }, { status: 403 })
    }

    const { reason } = await req.json()
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Dispute reason is required' }, { status: 400 })
    }

    proof.confirmationStatus = 'disputed'
    proof.disputeReason = reason.trim()
    proof.disputedBy   = user._id
    proof.disputedAt   = new Date()
    proof.auditLog.push({
      action:    'disputed',
      userId:    user._id,
      timestamp: new Date(),
      note:      reason.trim(),
    })
    await proof.save()

    return NextResponse.json({ success: true, data: proof })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
