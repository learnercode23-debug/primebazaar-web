import type { MetadataRoute } from 'next'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Canonical host is www (apex 308-redirects to it) — sitemap URLs must not redirect.
  const base = 'https://www.primepasal.com'
  const now = new Date()

  // Public, indexable pages only — never list pages robots.txt disallows
  // (cart/orders/profile/seller are private and excluded).
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                    lastModified: now, changeFrequency: 'daily',   priority: 1 },
    { url: `${base}/products`,      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/deals`,         lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/fresh`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/renewed`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/digital`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/live`,          lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${base}/gift-cards`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/membership`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/pickup-points`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`,         lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/support`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
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
