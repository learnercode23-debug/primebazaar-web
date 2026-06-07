'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Product } from '@/types'
import ProductCard from './ProductCard'

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    axios.get('/api/recently-viewed').then((r) => {
      const data = (r.data.data || []).filter((p: Product) => p._id !== excludeId)
      setProducts(data.slice(0, 6))
    }).catch(() => {})
  }, [excludeId])

  if (products.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  )
}
