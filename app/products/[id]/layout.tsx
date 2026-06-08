import type { Metadata } from 'next'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'

export const revalidate = 3600

interface ProductLean {
  title: string
  description?: string
  images?: string[]
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    await connectDB()
    const product = await Product.findById(params.id).select('title description images').lean() as ProductLean | null
    if (!product) return {}
    const desc = (product.description || '').slice(0, 155)
    const image = product.images?.[0] || ''
    return {
      title: `${product.title} — PrimePasal`,
      description: desc,
      openGraph: {
        title: `${product.title} — PrimePasal`,
        description: desc,
        images: image ? [{ url: image, width: 800, height: 800 }] : [],
        type: 'website',
        siteName: 'PrimePasal',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.title,
        description: desc,
        images: image ? [image] : [],
      },
    }
  } catch {
    return {}
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
