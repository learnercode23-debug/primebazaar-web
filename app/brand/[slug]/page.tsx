export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { connectDB } from '@/lib/mongodb'
import Product from '@/models/Product'
import Link from 'next/link'
import Image from 'next/image'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import FadeIn from '@/components/ui/FadeIn'

interface BrandPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const brand = decodeURIComponent(params.slug)
  return {
    title: `${brand} Official Store — Primepasal`,
    description: `Shop genuine ${brand} products on Primepasal. Verified seller, authentic products, fast delivery.`,
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const brand = decodeURIComponent(params.slug)

  await connectDB()
  const productCount = await Product.countDocuments({ brand: { $regex: `^${brand}$`, $options: 'i' }, isApproved: true })
  const topProducts = await Product.find({ brand: { $regex: `^${brand}$`, $options: 'i' }, isApproved: true })
    .sort({ rating: -1 })
    .limit(4)
    .lean() as Array<{ _id: string; images: string[]; title: string; discountPrice?: number; price: number; rating?: number }>

  const avgRating = topProducts.length
    ? (topProducts.reduce((s, p) => s + (p.rating || 0), 0) / topProducts.length).toFixed(1)
    : '—'

  // Brand initials for avatar fallback
  const initials = brand.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 flex items-center gap-6">
          {/* Brand logo placeholder */}
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-xl">
            <span className="text-2xl font-black text-gray-900">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black">{brand}</h1>
              <span className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                ✓ Verified Brand
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-300 flex-wrap">
              <span>⭐ {avgRating} avg rating</span>
              <span>📦 {productCount.toLocaleString()} products</span>
              <span>🛡️ Genuine products only</span>
            </div>
          </div>
          <Link
            href={`/products?brand=${encodeURIComponent(brand)}`}
            className="hidden sm:inline-block bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm transition-colors flex-shrink-0"
          >
            Shop all →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Brand story / A+ content */}
        <FadeIn>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="font-black text-gray-900 text-lg mb-2">About {brand}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {brand} is a trusted brand on Primepasal with {productCount} verified products. All {brand} products listed here are sourced directly from authorised distributors and carry the full manufacturer warranty. When you see the Primepasal <strong>Genuine Product</strong> badge, you can shop with confidence.
              </p>
              <div className="flex gap-3 mt-4 flex-wrap">
                {['Authentic', 'Manufacturer warranty', 'Fast dispatch', 'Hassle-free returns'].map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: '✅', label: 'Verified Seller' },
                { icon: '🛡️', label: '100% Genuine' },
                { icon: '↩️', label: '30-Day Returns' },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Top products preview */}
        {topProducts.length > 0 && (
          <FadeIn>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900">Top {brand} Products</h2>
                <Link href={`/products?brand=${encodeURIComponent(brand)}`} className="text-sm text-violet-600 hover:underline font-semibold">
                  View all {productCount} →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {topProducts.map(p => (
                  <Link key={String(p._id)} href={`/products/${p._id}`} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-violet-200 hover:shadow-md transition-all group">
                    <div className="relative h-36 bg-gray-50">
                      <Image src={p.images[0] || 'https://via.placeholder.com/300'} alt={p.title} fill className="object-contain p-3 group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.title}</p>
                      <p className="text-sm font-black text-gray-900">Rs.{(p.discountPrice || p.price).toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* All products via FeaturedProducts */}
        <FadeIn>
          <FeaturedProducts title={`All ${brand} Products`} query={`brand=${encodeURIComponent(brand)}&sort=rating&order=desc`} limit={8} />
        </FadeIn>

        <div className="text-center">
          <Link href={`/products?brand=${encodeURIComponent(brand)}`} className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3 rounded-full transition-colors">
            Browse all {brand} →
          </Link>
        </div>
      </div>
    </div>
  )
}
