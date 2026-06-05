import { Metadata } from 'next'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://primepasal.com'

async function getProduct(id: string) {
  try {
    const res = await fetch(`${BASE}/api/products/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getProduct(params.id)
  if (!p) return { title: 'Product — Primepasal' }

  const title = `${p.title} — Buy Online at Primepasal`
  const description = (p.description || `Buy ${p.title} online in Nepal. Cash on Delivery available. Best price guaranteed.`).slice(0, 160)
  const image = p.images?.[0] || `${BASE}/icon.svg`
  const url = `${BASE}/products/${params.id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: image, width: 800, height: 800, alt: p.title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const p = await getProduct(params.id)

  const jsonLd = p
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.title,
        description: (p.description || '').slice(0, 200),
        image: p.images || [],
        brand: { '@type': 'Brand', name: p.brand || 'Primepasal' },
        sku: p._id,
        offers: {
          '@type': 'Offer',
          url: `${BASE}/products/${params.id}`,
          priceCurrency: 'NPR',
          price: p.discountPrice || p.price,
          availability:
            p.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'Primepasal' },
        },
        ...(p.averageRating > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.averageRating,
            reviewCount: p.reviewCount || 1,
          },
        }),
      })
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {children}
    </>
  )
}
