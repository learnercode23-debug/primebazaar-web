'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'
import { useAuth } from '@/contexts/AuthContext'
import { FiZap } from 'react-icons/fi'

interface ScoredProduct extends Product {
  mlScore: number
  reasonCategory: string
}

function computeScore(p: Product, nowMs: number): number {
  const ageMs   = nowMs - new Date((p as unknown as { createdAt?: string }).createdAt || 0).getTime()
  const ageDays = Math.min(ageMs / 86_400_000, 365)
  const recency = 1 - ageDays / 365
  const sales   = Math.min((p.salesCount || 0) / 500, 1)
  const rating  = (p.rating || 0) / 5
  return sales * 0.40 + rating * 0.35 + recency * 0.25
}

export default function PersonalizedForYou() {
  const { user } = useAuth()
  const [products, setProducts]   = useState<ScoredProduct[]>([])
  const [loading, setLoading]     = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    axios.get('/api/recently-viewed').then(async (r) => {
      const viewed: Product[] = r.data.data || []
      if (viewed.length === 0) { setLoading(false); return }

      // Extract unique category IDs/names from viewed products
      const catMap = new Map<string, string>()
      for (const p of viewed) {
        const catName = (p as unknown as { category?: { name?: string; _id?: string } | string }).category
        if (catName && typeof catName === 'object' && catName.name) {
          catMap.set(catName.name, catName.name)
        }
      }
      const cats = Array.from(catMap.values()).slice(0, 3)
      setCategories(cats)

      if (cats.length === 0) { setLoading(false); return }

      const now = Date.now()
      const allScored: ScoredProduct[] = []

      await Promise.all(
        cats.map(async (cat) => {
          const res = await axios.get(`/api/products?category=${encodeURIComponent(cat)}&limit=12&sort=salesCount&order=desc`)
          const prods: Product[] = res.data.data || []
          for (const p of prods) {
            if (!allScored.find(x => x._id === p._id)) {
              allScored.push({ ...p, mlScore: computeScore(p, now), reasonCategory: cat })
            }
          }
        })
      )

      allScored.sort((a, b) => b.mlScore - a.mlScore)
      setProducts(allScored.slice(0, 16))
    })
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [user])

  if (!user || (!loading && products.length === 0)) return null

  const tabProducts = activeTab === 0
    ? products
    : products.filter(p => p.reasonCategory === categories[activeTab])

  return (
    <section className="mt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiZap className="text-violet-500" />
            Recommended for You
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalised based on your browsing history · ML-ranked
          </p>
        </div>
        <Link href="/products" className="text-sm text-violet-600 hover:underline font-medium">
          Browse all →
        </Link>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setActiveTab(0)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 0 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
            }`}
          >
            All picks
          </button>
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setActiveTab(i + 1)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                activeTab === i + 1 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
              }`}
            >
              Because you viewed {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {tabProducts.slice(0, 8).map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
