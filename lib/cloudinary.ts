import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
})

export async function uploadImage(
  base64: string,
  folder = 'amazonia/products'
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  })
  return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

export function getOptimizedUrl(publicId: string, options: { width?: number; height?: number; crop?: string } = {}): string {
  return cloudinary.url(publicId, {
    ...options,
    quality: 'auto',
    fetch_format: 'auto',
  })
}

export default cloudinary
