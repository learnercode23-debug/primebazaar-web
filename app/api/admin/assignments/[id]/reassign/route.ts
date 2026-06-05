export const dynamic = 'force-dynamic'
/**
 * POST /api/admin/assignments/:subOrderId/reassign
 * Manually reassign a sub-order to a different seller.
 * Body: { newSellerId: string, reason?: string }
 *
 * Validates the new seller has stock, updates the sub-order,
 * and writes an AssignmentLog entry.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SubOrder from '@/models/SubOrder'
import AssignmentLog from '@/models/AssignmentLog'
import SellerInventory from '@/models/SellerInventory'
import User from '@/models/User'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAuthUser(req)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { newSellerId, reason } = await req.json()
    if (!newSellerId) {
      return NextResponse.json({ success: false, error: 'newSellerId required' }, { status: 400 })
    }

    // Load the sub-order
    const subOrder = await SubOrder.findById(params.id)
    if (!subOrder) {
      return NextResponse.json({ success: false, error: 'Sub-order not found' }, { status: 404 })
    }

    // Validate the new seller exists and is active
    const newSeller = await User.findOne({ _id: newSellerId, role: 'seller', isActive: true }).select('name')
    if (!newSeller) {
      return NextResponse.json({ success: false, error: 'Seller not found or inactive' }, { status: 400 })
    }

    // Check that the new seller has inventory for ALL items in the sub-order
    for (const item of subOrder.items) {
      const inv = await SellerInventory.findOne({
        product:  item.product,
        seller:   newSellerId,
        isActive: true,
        stock:    { $gte: item.quantity },
      })
      if (!inv) {
        return NextResponse.json({
          success: false,
          error: `${newSeller.name} does not have enough stock for "${item.title}"`,
        }, { status: 400 })
      }
    }

    const previousSellerId = subOrder.seller.toString()
    const assignmentReason = reason?.trim() ||
      `Manually reassigned by admin from ${previousSellerId} to ${newSellerId}`

    // Update the sub-order
    subOrder.seller           = newSellerId
    subOrder.assignmentRule   = 'manual'
    subOrder.assignmentReason = `Admin reassignment: ${assignmentReason}`
    subOrder.statusHistory.push({
      status:    subOrder.status,
      timestamp: new Date(),
      note:      `Reassigned to seller ${newSeller.name} by admin`,
    })
    await subOrder.save()

    // Write audit log
    await AssignmentLog.create({
      subOrder:    subOrder._id,
      order:       subOrder.parentOrder,
      action:      'manual_reassigned',
      fromSeller:  previousSellerId,
      toSeller:    newSellerId,
      rule:        'manual',
      reason:      assignmentReason,
      performedBy: admin._id,
      timestamp:   new Date(),
    })

    return NextResponse.json({
      success: true,
      message: `Sub-order reassigned to ${newSeller.name}`,
    })
  } catch (err) {
    console.error('Reassign error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
