import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://primepasal.com'
  const now = new Date()

  return [
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
}
