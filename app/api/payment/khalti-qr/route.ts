export const dynamic = 'force-dynamic'
/**
 * GET  /api/payment/khalti-qr   — public: get QR image URL + account info
 * POST /api/payment/khalti-qr   — admin: upload new QR image via base64
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import PaymentSetting from '@/models/PaymentSetting'
import { uploadImage } from '@/lib/cloudinary'

export async function GET() {
  try {
    await connectDB()
    let setting = await PaymentSetting.findOne().lean()
    if (!setting) {
      setting = await PaymentSetting.create({})
    }
    return NextResponse.json({ success: true, data: setting })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { imageBase64, phoneNumber, accountName, isKhaltiQrEnabled } = await req.json()

    const update: Record<string, unknown> = { updatedBy: user._id }

    if (imageBase64) {
      const uploaded = await uploadImage(imageBase64, 'primepasal/khalti-qr')
      update.khaltiQrImageUrl = uploaded.url
    }
    if (phoneNumber)       update.khaltiPhoneNumber  = phoneNumber
    if (accountName)       update.khaltiAccountName  = accountName
    if (isKhaltiQrEnabled !== undefined) update.isKhaltiQrEnabled = isKhaltiQrEnabled

    const setting = await PaymentSetting.findOneAndUpdate(
      {}, update, { upsert: true, new: true }
    )
    return NextResponse.json({ success: true, data: setting })
  } catch (err) {
    console.error('Khalti QR upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
