export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { uploadImage } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { image, folder } = await req.json()
    if (!image) return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })

    // Validate it's a base64 data URL
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ success: false, error: 'Invalid image format' }, { status: 400 })
    }

    const result = await uploadImage(image, folder || 'primebazaar/products')
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}
