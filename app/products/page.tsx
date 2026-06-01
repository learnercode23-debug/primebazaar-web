'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Product } from '@/types'
import ProductCard from '@/components/product/ProductCard'
import FilterSidebar from '@/components/product/FilterSidebar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { FiGrid, FiList, FiSliders } from 'react-icons/fi'

function ProductsContent() {
  const params = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const page = parseInt(params.get('page') || '1')
  const category = params.get('category')
  const search = params.get('search')

  useEffect(() => {
    setLoading(true)
    axios.get(`/api/products?${params.toString()}`).then((r) => {
      setProducts(r.data.data || [])
      setTotal(r.data.total || 0)
      setTotalPages(r.data.totalPages || 0)
    }).finally(() => setLoading(false))
  }, [params])

  function goToPage(p: number) {
    const current = new URLSearchParams(params.toString())
    current.set('page', String(p))
    window.history.pushState({}, '', `/products?${current.toString()}`)
    window.dispatchEvent(new Event('popstate'))
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    ...(category ? [{ label: category }] : []),
    ...(search ? [{ label: `"${search}"` }] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <div className="hidden lg:block">
          <FilterSidebar />
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-72 bg-white overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-bold">Filters</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-900">✕</button>
              </div>
              <div className="p-4">
                <FilterSidebar />
              </div>
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 flex-wrap">
            <div>
              {search ? (
                <h1 className="text-base sm:text-lg font-bold text-gray-900">Results for &quot;{search}&quot;</h1>
              ) : category ? (
                <h1 className="text-base sm:text-lg font-bold text-gray-900">{category}</h1>
              ) : (
                <h1 className="text-base sm:text-lg font-bold text-gray-900">All Products</h1>
              )}
              {!loading && (
                <p className="text-xs sm:text-sm text-gray-500">{total.toLocaleString()} results</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm hover:border-gray-400"
              >
                <FiSliders className="text-xs" /> Filters
              </button>

              {/* View mode */}
              <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-amazon-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <FiGrid />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-amazon-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <FiList />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-52 sm:h-72" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="text-5xl sm:text-6xl mb-4">🔍</div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No products found</h2>
              <p className="text-sm text-gray-500">Try adjusting your filters or search terms</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
              {products.map((p) => <ProductCard key={p._id} product={p} variant="grid" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => <ProductCard key={p._id} product={p} variant="list" />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:border-amazon-orange transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-amazon-dark text-white' : 'border border-gray-300 hover:border-amazon-orange'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:border-amazon-orange transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <ProductsContent />
    </Suspense>
  )
}
