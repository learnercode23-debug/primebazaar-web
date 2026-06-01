'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Product } from '@/types'
import ProductCard from './ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'

export default function Recommendations({ productId }: { productId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/products/${productId}/recommendations`)
      .then((r) => setProducts(r.data.data || []))
      .finally(() => setLoading(false))
  }, [productId])

  if (!loading && products.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Customers who viewed this also viewed</h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
