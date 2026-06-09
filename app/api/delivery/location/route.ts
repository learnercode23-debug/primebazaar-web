export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'

// Delivery agent pushes GPS coordinates for a given order
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { orderId, lat, lng, speed, heading } = body

    if (!orderId || lat == null || lng == null) {
      return NextResponse.json({ success: false, error: 'orderId, lat, lng required' }, { status: 400 })
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ success: false, error: 'lat/lng must be numbers' }, { status: 400 })
    }

    await connectDB()

    // Update the order's driver location (works even if model has no explicit field — MongoDB is flexible)
    const result = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          driverLocation: {
            lat,
            lng,
            speed: speed ?? null,
            heading: heading ?? null,
            at: new Date(),
          },
        },
      },
      { new: false }
    ).lean()

    if (!result) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('location push error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// Customer polls the driver's current location for their order
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 })

    await connectDB()

    const order = await Order.findById(orderId)
      .select('user status driverLocation shippingAddress')
      .lean() as {
        user: { toString: () => string }
        status: string
        driverLocation?: { lat: number; lng: number; speed: number | null; heading: number | null; at: Date }
        shippingAddress?: { city?: string }
      } | null

    if (!order) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    // Only the order's customer or admin can see the location
    if (user.role !== 'admin' && order.user.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: order.status,
        driverLocation: order.driverLocation ?? null,
      },
    })
  } catch (err) {
    console.error('location poll error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
