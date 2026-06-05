// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * PATCH /api/delivery-proof/:id/confirm
 * Seller or Admin confirms the delivery proof.
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

    // Only seller of this order or admin can confirm
    const order = await Order.findById(proof.order).select('items')
    const isSeller = order?.items?.some(i => i.seller?.toString() === user._id.toString())
    if (!isSeller && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the order seller or admin can confirm' }, { status: 403 })
    }

    if (proof.confirmationStatus === 'confirmed') {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 409 })
    }

    proof.confirmationStatus = 'confirmed'
    proof.confirmedBy  = user._id
    proof.confirmedAt  = new Date()
    proof.auditLog.push({
      action:    'confirmed',
      userId:    user._id,
      timestamp: new Date(),
      note:      `Confirmed by ${user.role}`,
    })
    await proof.save()

    return NextResponse.json({ success: true, data: proof })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
