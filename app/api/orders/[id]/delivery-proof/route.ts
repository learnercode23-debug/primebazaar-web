// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * POST /api/orders/:id/delivery-proof
 * Agent uploads proof photo + GPS after OTP verification.
 * Body (JSON): { photoBase64, latitude?, longitude?, recipientName?, otpVerified }
 *
 * GET /api/orders/:id/delivery-proof
 * Seller / Admin / Customer views the proof for their order.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Order from '@/models/Order'
import DeliveryProof from '@/models/DeliveryProof'
import { uploadImage } from '@/lib/cloudinary'

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`

/** Haversine distance in km between two lat/lng points */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ── POST — upload proof ── */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Only the assigned agent (or admin) can upload proof
    const isAssigned = order.deliveryCodeCollectedBy?.toString() === user._id.toString()
    if (!isAssigned && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the assigned delivery agent can upload proof' }, { status: 403 })
    }

    // One proof per order (idempotent)
    const existing = await DeliveryProof.findOne({ order: params.id })
    if (existing) {
      return NextResponse.json({ error: 'Proof already uploaded for this order', data: existing }, { status: 409 })
    }

    const { photoBase64, latitude, longitude, recipientName, otpVerified } = await req.json()

    if (!photoBase64) {
      return NextResponse.json({ error: 'Photo (base64) is required' }, { status: 400 })
    }

    // Validate base64 is an image
    if (!photoBase64.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Upload to Cloudinary using existing utility
    const cloudData = await uploadImage(photoBase64, 'primebazaar/delivery-proofs')

    // Check GPS distance from delivery address (if available)
    let locationFlagged = false
    let distanceKm: number | undefined
    if (latitude && longitude && order.shippingAddress) {
      // We don't have geocoded lat/lng for the address, so just store capture coords
      // Flag if no GPS provided at all (agent might be blocking location)
      locationFlagged = false
    } else if (!latitude && !longitude) {
      // No GPS — flag as suspicious but don't block
      locationFlagged = true
    }

    const proof = await DeliveryProof.create({
      order:             params.id,
      agent:             user._id,
      photoUrl:          cloudData.url,
      photoPublicId:     cloudData.publicId,
      capturedAt:        new Date(),
      latitude,
      longitude,
      locationFlagged,
      distanceKm,
      otpVerified:       !!otpVerified,
      recipientName:     recipientName || undefined,
      confirmationStatus:'pending',
      auditLog: [{
        action:    'proof_uploaded',
        userId:    user._id,
        timestamp: new Date(),
        note:      `Photo uploaded. GPS: ${latitude ? `${latitude},${longitude}` : 'not provided'}`,
      }],
    })

    return NextResponse.json({ success: true, data: proof }, { status: 201 })
  } catch (err) {
    console.error('Delivery proof upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ── GET — view proof ── */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const order = await Order.findById(params.id).select('user items seller deliveryCodeCollectedBy')
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Access control: customer (own order), seller (own products), agent, or admin
    const isCustomer = order.user?.toString() === user._id.toString()
    const isAgent    = order.deliveryCodeCollectedBy?.toString() === user._id.toString()
    const isSeller   = order.items?.some(i => i.seller?.toString() === user._id.toString())

    if (!isCustomer && !isAgent && !isSeller && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const proof = await DeliveryProof.findOne({ order: params.id })
      .populate('agent',      'name email')
      .populate('confirmedBy','name')
      .populate('disputedBy', 'name')
      .lean()

    if (!proof) return NextResponse.json({ success: true, data: null })

    return NextResponse.json({ success: true, data: proof })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
