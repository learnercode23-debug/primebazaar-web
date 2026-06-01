'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import { FiSearch, FiX, FiTrendingUp } from 'react-icons/fi'
import { formatPrice } from '@/lib/utils'

interface SearchResult {
  products: Array<{ _id: string; title: string; images: string[]; price: number; discountPrice?: number; brand: string; slug?: string }>
  brands: string[]
  suggestions: string[]
}

export default function SearchAutocomplete({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await axios.get(`/api/products/search?q=${encodeURIComponent(q)}&limit=5`)
      setResults(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 250)
    } else {
      setResults(null)
    }
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`)
      setOpen(false)
      setQuery('')
    }
  }

  function selectSuggestion(s: string) {
    router.push(`/products?search=${encodeURIComponent(s)}`)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex rounded-lg overflow-hidden">
        <div className="relative flex-1 flex bg-white">
          <select className="bg-gray-200 text-gray-700 text-sm rounded-l-md px-2 border-r border-gray-300 hidden sm:block focus:outline-none cursor-pointer">
            <option>All</option>
            <option>Electronics</option>
            <option>Fashion</option>
            <option>Home</option>
            <option>Books</option>
            <option>Sports</option>
          </select>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search products..."
            className="flex-1 px-3 py-1.5 sm:py-2 text-gray-900 text-sm focus:outline-none min-w-0"
            style={{ fontSize: 16 }}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults(null) }} className="px-1.5 text-gray-400 hover:text-gray-700">
              <FiX className="text-sm" />
            </button>
          )}
          <button type="submit" className="bg-violet-600 hover:bg-violet-700 px-3 sm:px-4 flex items-center justify-center transition-colors flex-shrink-0">
            <FiSearch className="text-white text-base sm:text-lg" />
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && (query.length >= 2) && (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-b-xl border border-gray-200 z-50 max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>
          ) : results ? (
            <>
              {/* Suggestions */}
              {results.suggestions && results.suggestions.length > 0 && (
                <div className="border-b border-gray-100">
                  {results.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <FiSearch className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{s}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Brand suggestions */}
              {results.brands && results.brands.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Brands</p>
                  <div className="flex flex-wrap gap-2">
                    {results.brands.map((b, i) => (
                      <button
                        key={i}
                        onClick={() => selectSuggestion(b)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition-colors"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {results.products && results.products.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide px-1 mb-1.5">Products</p>
                  {results.products.map((product) => {
                    const price = product.discountPrice || product.price
                    return (
                      <button
                        key={product._id}
                        onClick={() => { router.push(`/products/${product._id}`); setOpen(false); setQuery('') }}
                        className="w-full flex items-center gap-3 px-1 py-2 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <div className="relative w-10 h-10 bg-gray-50 rounded flex-shrink-0">
                          <Image
                            src={product.images[0] || 'https://via.placeholder.com/80'}
                            alt={product.title}
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-1">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(price)}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-gray-100 px-4 py-2.5">
                <button onClick={handleSubmit} className="text-sm text-amazon-teal hover:underline flex items-center gap-1">
                  <FiTrendingUp className="text-xs" /> See all results for &quot;{query}&quot;
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 text-sm text-gray-400 text-center">No results for &quot;{query}&quot;</div>
          )}
        </div>
      )}
    </div>
  )
}
