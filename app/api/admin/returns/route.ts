export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ReturnRequest from '@/models/ReturnRequest'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const returns = await ReturnRequest.find()
      .populate('user', 'name email')
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json({ success: true, data: returns })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
