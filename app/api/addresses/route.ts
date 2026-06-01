import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const u = await User.findById(user._id).select('savedAddresses')
    return NextResponse.json({ success: true, data: u?.savedAddresses || [] })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const address = await req.json()
    const u = await User.findById(user._id)
    if (!u) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    // If this is default, unset others
    if (address.isDefault) {
      u.savedAddresses.forEach((a: { isDefault: boolean }) => { a.isDefault = false })
    }
    if (u.savedAddresses.length === 0) address.isDefault = true

    u.savedAddresses.push(address)
    await u.save()

    return NextResponse.json({ success: true, data: u.savedAddresses })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { addressId, ...update } = await req.json()
    const u = await User.findById(user._id)
    if (!u) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const addr = u.savedAddresses.id(addressId)
    if (!addr) return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404 })

    if (update.isDefault) {
      u.savedAddresses.forEach((a: { isDefault: boolean }) => { a.isDefault = false })
    }

    Object.assign(addr, update)
    await u.save()
    return NextResponse.json({ success: true, data: u.savedAddresses })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { addressId } = await req.json()
    const u = await User.findById(user._id)
    if (!u) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    u.savedAddresses = u.savedAddresses.filter((a: { _id?: { toString: () => string } }) => a._id?.toString() !== addressId)
    await u.save()
    return NextResponse.json({ success: true, data: u.savedAddresses })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
