/**
 * POST /api/cod/check-eligibility
 * Checks if COD is available for a given order before checkout.
 * Body: { orderTotal, zipCode, productIds }
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import CODSettings from '@/models/CODSettings'
import Order from '@/models/Order'
import Product from '@/models/Product'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  await connectDB()
  const { orderTotal, zipCode, productIds } = await req.json()

  const settings = await CODSettings.findOne().lean() as {
    isEnabled: boolean
    maxOrderValue: number
    serviceablePincodes: string[]
    blockedCategories: string[]
    handlingFee: number
    handlingFeeType: string
    otpRequired: boolean
  } | null

  if (!settings || !settings.isEnabled) {
    return NextResponse.json({ eligible: false, reason: 'COD is currently not available' })
  }

  // Check order value limit
  if (orderTotal > settings.maxOrderValue) {
    return NextResponse.json({
      eligible: false,
      reason: `COD not available for orders above Rs.${settings.maxOrderValue.toLocaleString()}`,
    })
  }

  // Check pincode serviceability (if configured)
  if (settings.serviceablePincodes.length > 0 && zipCode) {
    if (!settings.serviceablePincodes.includes(String(zipCode))) {
      return NextResponse.json({ eligible: false, reason: 'COD is not available at your delivery location' })
    }
  }

  // Check if any product has COD disabled
  if (productIds?.length) {
    const products = await Product.find({ _id: { $in: productIds } }).select('title category').lean()
    const blockedSet = new Set(settings.blockedCategories.map(String))
    for (const p of products) {
      if (blockedSet.has(String(p.category))) {
        return NextResponse.json({ eligible: false, reason: `COD not available for some items in your cart` })
      }
    }
  }

  // Check if customer is flagged for COD abuse
  const user = await getAuthUser(req)
  if (user) {
    const userData = await User.findById(user._id).select('codBlocked').lean() as { codBlocked?: boolean } | null
    if (userData?.codBlocked) {
      return NextResponse.json({ eligible: false, reason: 'COD is not available for your account due to previous order issues' })
    }
  }

  // Calculate COD fee
  const fee = settings.handlingFeeType === 'percentage'
    ? Math.round(orderTotal * settings.handlingFee / 100)
    : settings.handlingFee

  return NextResponse.json({
    eligible: true,
    codFee: fee,
    otpRequired: settings.otpRequired,
    message: `Pay Rs.${(orderTotal + fee).toLocaleString()} on delivery`,
  })
}
