'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { FiHeart, FiShoppingCart, FiZap } from 'react-icons/fi'

interface ScoredProduct extends Product {
  mlScore: number
  matchPct: number
}

function mlScore(p: Product, anchorPrice: number, nowMs: number): number {
  const ageMs    = nowMs - new Date((p as unknown as { createdAt: string }).createdAt || 0).getTime()
  const ageDays  = Math.min(ageMs / 86_400_000, 365)
  const recency  = 1 - ageDays / 365                             // 0–1, newer = higher
  const sales    = Math.min((p.salesCount || 0) / 500, 1)        // 0–1
  const rating   = (p.rating || 0) / 5                           // 0–1
  const priceSim = 1 - Math.min(Math.abs(p.price - anchorPrice) / (anchorPrice || 1), 1) // 0–1
  return sales * 0.35 + rating * 0.30 + recency * 0.20 + priceSim * 0.15
}

export default function YouMightAlsoLike({
  anchorId,
  anchorPrice,
  category,
}: {
  anchorId: string
  anchorPrice: number
  category?: string
}) {
  const { addToCart, isInCart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()
  const [products, setProducts] = useState<ScoredProduct[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({
      limit: '20',
      sort: 'salesCount',
      order: 'desc',
    })
    if (category) params.set('category', category)

    axios.get(`/api/products?${params}`)
      .then(r => {
        const raw: Product[] = (r.data.data || []).filter((p: Product) => p._id !== anchorId)
        const now = Date.now()
        const scored: ScoredProduct[] = raw
          .map(p => {
            const score = mlScore(p, anchorPrice, now)
            return { ...p, mlScore: score, matchPct: Math.round(score * 100) }
          })
          .sort((a, b) => b.mlScore - a.mlScore)
          .slice(0, 6)
        setProducts(scored)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anchorId, anchorPrice, category])

  if (!loading && products.length === 0) return null

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">You Might Also Like</h2>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <FiZap className="text-violet-500" />
            Ranked by ML · sales velocity · rating · price match
          </p>
        </div>
        {category && (
          <Link href={`/products?category=${encodeURIComponent(category)}&sort=salesCount&order=desc`}
            className="text-sm text-violet-600 hover:underline font-medium">
            See all in {category} →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {products.map((p) => {
            const price      = p.discountPrice || p.price
            const wishlisted = isWishlisted(p._id)
            const inCart     = isInCart(p._id)

            return (
              <div key={p._id}
                className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col hover:shadow-lg hover:border-violet-200 transition-all group relative">

                {/* ML match badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    p.matchPct >= 80 ? 'bg-violet-600 text-white' :
                    p.matchPct >= 60 ? 'bg-violet-100 text-violet-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.matchPct}% match
                  </span>
                </div>

                {/* Wishlist */}
                <button onClick={() => toggleWishlist(p._id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <FiHeart className={`text-xs ${wishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                </button>

                <Link href={`/products/${p._id}`} className="block mb-2">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50">
                    <Image
                      src={p.images[0] || 'https://via.placeholder.com/200'}
                      alt={p.title}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </Link>

                <Link href={`/products/${p._id}`}>
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 mb-1 hover:text-violet-700 transition-colors">
                    {p.title}
                  </p>
                </Link>

                <StarRating rating={p.rating} size="sm" />

                <div className="mt-auto pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formatPrice(price)}</p>
                    {p.discountPrice && p.discountPrice < p.price && (
                      <p className="text-[10px] text-gray-400 line-through">{formatPrice(p.price)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(p._id)}
                    disabled={p.stock === 0}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      inCart ? 'bg-green-100 text-green-600' :
                      p.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                      'bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white'
                    }`}
                  >
                    <FiShoppingCart className="text-xs" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
