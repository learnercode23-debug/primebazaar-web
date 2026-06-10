import type { Metadata } from 'next'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'

export const revalidate = 3600

interface ProductLean {
  title: string
  description?: string
  images?: string[]
  price?: number
  discountPrice?: number
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    await connectDB()
    const product = await Product.findById(params.id).select('title description images price discountPrice').lean() as ProductLean | null
    if (!product) return {}
    const price = product.discountPrice || product.price
    const desc = [
      price ? `Rs.${price.toLocaleString()}` : '',
      (product.description || '').replace(/\s+/g, ' ').trim(),
    ].filter(Boolean).join(' — ').slice(0, 160)
    const image = product.images?.[0] || ''
    return {
      title: `${product.title} — PrimePasal`,
      description: desc,
      alternates: { canonical: `/products/${params.id}` },
      openGraph: {
        title: `${product.title} — PrimePasal`,
        description: desc,
        url: `/products/${params.id}`,
        images: image ? [{ url: image, width: 800, height: 800 }] : [{ url: '/og-image.png', width: 1200, height: 630 }],
        type: 'website',
        siteName: 'PrimePasal',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.title,
        description: desc,
        images: image ? [image] : ['/og-image.png'],
      },
    }
  } catch {
    return {}
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
