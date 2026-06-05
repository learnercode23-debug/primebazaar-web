export const dynamic = 'force-dynamic'
/**
 * GET /api/seller/cod-orders
 * Returns the logged-in seller's COD orders with collection/remittance status.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page  = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const skip  = (page - 1) * limit

    // Find orders where at least one item belongs to this seller
    const orders = await Order.find({
      paymentMethod: 'cod',
      'items.seller': user._id,
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Order.countDocuments({
      paymentMethod: 'cod',
      'items.seller': user._id,
    })

    // Per-status counts for tabs
    const allCOD = await Order.find({ paymentMethod: 'cod', 'items.seller': user._id })
      .select('status codCollected codRemittanceStatus').lean()

    const counts = {
      total:      allCOD.length,
      pending:    allCOD.filter(o => !o.codCollected).length,
      collected:  allCOD.filter(o => o.codCollected && o.codRemittanceStatus === 'pending').length,
      remitted:   allCOD.filter(o => o.codRemittanceStatus === 'remitted').length,
      refused:    allCOD.filter(o => o.status === 'refused').length,
    }

    return NextResponse.json({ success: true, data: orders, total, page, counts })
  } catch (err) {
    console.error('Seller COD orders error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
