'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'
import FadeIn from '@/components/ui/FadeIn'

interface FeaturedProductsProps {
  title?: string
  query?: string
  limit?: number
}

export default function FeaturedProducts({
  title = 'Featured Products',
  query = 'featured=true',
  limit = 8,
}: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/products?${query}&limit=${limit}`)
      .then((r) => setProducts(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [query, limit])

  return (
    <section>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <span className="block w-1 h-6 rounded-full bg-gradient-to-b from-violet-600 to-purple-400" />
          <h2 className="text-base sm:text-xl font-black text-gray-900">{title}</h2>
        </div>
        <Link href="/products" className="text-xs sm:text-sm text-violet-600 font-semibold hover:underline">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-56 sm:h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {products.map((product, i) => (
            <FadeIn key={product._id} delay={i * 60}>
              <ProductCard product={product} />
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  )
}
