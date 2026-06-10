'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { FiZap, FiTag, FiClock } from 'react-icons/fi'

const TABS = [
  { key: 'all',       label: 'All Deals' },
  { key: 'lightning', label: '⚡ Lightning' },
  { key: 'deal',      label: '🔥 Deal of Day' },
  { key: 'sale',      label: '🏷️ On Sale' },
] as const

type Tab = typeof TABS[number]['key']

export default function DealsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    setLoading(true)
    axios.get('/api/products?sort=discountPercent&order=desc&limit=40')
      .then((r) => setProducts((r.data.data || []).filter((p: Product) => p.discountPrice && p.discountPrice < p.price)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter((p) => {
    if (tab === 'lightning') return (p as unknown as { isLightningDeal?: boolean }).isLightningDeal
    if (tab === 'deal') return p.isDealOfDay
    if (tab === 'sale') return p.discountPrice && !p.isDealOfDay && !(p as unknown as { isLightningDeal?: boolean }).isLightningDeal
    return true
  })

  const totalSavings = filtered.reduce((sum, p) => sum + (p.discountPrice ? p.price - p.discountPrice : 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10">

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 rounded-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <FiZap className="text-2xl text-yellow-300" />
            <span className="text-sm font-bold uppercase tracking-widest text-yellow-300">Limited Time</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Today&apos;s Best Deals</h1>
          <p className="text-white/80 text-sm sm:text-base mb-4">
            {products.length} deals · Save up to <strong className="text-yellow-300">{products.length > 0 ? Math.max(...products.map(p => p.discountPercent || 0)) : 0}%</strong> off
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <FiClock className="text-yellow-300" />
              <span className="text-sm font-semibold">Refreshes every 24 hours</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <FiTag className="text-yellow-300" />
              <span className="text-sm font-semibold">Rs.{totalSavings.toLocaleString('en-IN')} in savings available</span>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-4 -bottom-8 w-28 h-28 bg-white/10 rounded-full" />
      </div>

      {/* Tab filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all press-effect ${
              tab === t.key ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
            }`}
          >
            {t.label}
            {!loading && <span className="ml-1.5 text-xs opacity-70">
              ({tab === t.key
                ? filtered.length
                : t.key === 'all' ? products.length
                : t.key === 'lightning' ? products.filter(p => (p as unknown as { isLightningDeal?: boolean }).isLightningDeal).length
                : t.key === 'deal' ? products.filter(p => p.isDealOfDay).length
                : products.filter(p => p.discountPrice && !p.isDealOfDay && !(p as unknown as { isLightningDeal?: boolean }).isLightningDeal).length
              })
            </span>}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiZap className="text-5xl mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No deals in this category right now</p>
          <p className="text-sm mt-1">Check back later — deals refresh daily</p>
        </div>
      ) : (
        <>
          {/* Deal of the day spotlight */}
          {tab === 'all' && products.filter(p => p.isDealOfDay).length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full" /> Deal of the Day
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {products.filter(p => p.isDealOfDay).slice(0, 4).map(p => (
                  <div key={p._id} className="relative">
                    <ProductCard product={p} />
                    {p.dealEndTime && (
                      <div className="absolute top-2 left-2 right-2 bg-black/70 text-white text-[10px] text-center py-0.5 px-2 rounded-full">
                        <CountdownTimer endTime={p.dealEndTime} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-violet-600 rounded-full" /> More Deals
              </h2>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {(tab === 'all' ? filtered.filter(p => !p.isDealOfDay) : filtered).map(p => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
