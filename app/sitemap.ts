import type { MetadataRoute } from 'next'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://primepasal.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                   lastModified: now, changeFrequency: 'daily',   priority: 1 },
    { url: `${base}/products`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/login`,        lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/register`,     lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/cart`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/orders`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/profile`,      lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/seller`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/support`,      lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/wishlist`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },
  ]

  try {
    await connectDB()
    const products = await Product.find({ isApproved: true }).select('_id updatedAt').lean() as { _id: string; updatedAt?: Date }[]
    const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/products/${p._id}`,
      lastModified: p.updatedAt || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    return [...staticPages, ...productUrls]
  } catch {
    return staticPages
  }
}
