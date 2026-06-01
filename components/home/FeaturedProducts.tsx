'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'

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
      .finally(() => setLoading(false))
  }, [query, limit])

  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold text-gray-900">{title}</h2>
        <Link href="/products" className="text-amazon-teal text-xs sm:text-sm hover:underline font-medium">
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
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
