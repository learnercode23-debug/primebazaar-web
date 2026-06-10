'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'
import FadeIn from '@/components/ui/FadeIn'

export default function LightningDealsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/products?sort=discountPercent&order=desc&limit=4')
      .then(r => setProducts(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h2 className="font-black text-white text-base sm:text-lg">Lightning Deals</h2>
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">Limited time</span>
        </div>
        <Link href="/deals" className="text-xs sm:text-sm text-white/90 hover:text-white font-semibold hover:underline" aria-label="See all Lightning Deals">
          See all deals →
        </Link>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-amber-100 animate-pulse rounded-xl h-56 sm:h-72" />
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
      </div>
    </div>
  )
}
