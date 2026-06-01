'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi'
import { CATEGORIES } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'

export default function FilterSidebar() {
  const router = useRouter()
  const params = useSearchParams()
  const [openSections, setOpenSections] = useState({ category: true, price: true, rating: true, brand: false })
  const [priceRange, setPriceRange] = useState({
    min: params.get('minPrice') || '',
    max: params.get('maxPrice') || '',
  })

  function toggle(section: keyof typeof openSections) {
    setOpenSections((p) => ({ ...p, [section]: !p[section] }))
  }

  function updateFilter(key: string, value: string | null) {
    const current = new URLSearchParams(params.toString())
    current.set('page', '1')
    if (value) current.set(key, value)
    else current.delete(key)
    router.push(`/products?${current.toString()}`)
  }

  function applyPriceFilter() {
    const current = new URLSearchParams(params.toString())
    current.set('page', '1')
    if (priceRange.min) current.set('minPrice', priceRange.min)
    else current.delete('minPrice')
    if (priceRange.max) current.set('maxPrice', priceRange.max)
    else current.delete('maxPrice')
    router.push(`/products?${current.toString()}`)
  }

  function clearFilters() {
    const search = params.get('search')
    router.push(search ? `/products?search=${search}` : '/products')
    setPriceRange({ min: '', max: '' })
  }

  const hasFilters = params.get('category') || params.get('minPrice') || params.get('maxPrice') || params.get('minRating')

  const Section = ({ title, sectionKey, children }: { title: string; sectionKey: keyof typeof openSections; children: React.ReactNode }) => (
    <div className="border-b border-gray-200 py-4">
      <button onClick={() => toggle(sectionKey)} className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 mb-2">
        {title} {openSections[sectionKey] ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {openSections[sectionKey] && children}
    </div>
  )

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900">Filters</h2>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-amazon-teal hover:underline flex items-center gap-1">
              <FiX /> Clear all
            </button>
          )}
        </div>

        <Section title="Category" sectionKey="category">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => updateFilter('category', null)}
                className={`text-sm w-full text-left py-0.5 ${!params.get('category') ? 'text-amazon-orange font-semibold' : 'text-gray-700 hover:text-amazon-orange'}`}
              >
                All Categories
              </button>
            </li>
            {CATEGORIES.map((cat) => (
              <li key={cat.name}>
                <button
                  onClick={() => updateFilter('category', cat.name)}
                  className={`text-sm w-full text-left py-0.5 ${params.get('category') === cat.name ? 'text-amazon-orange font-semibold' : 'text-gray-700 hover:text-amazon-orange'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Price Range" sectionKey="price">
          <div className="flex gap-2 items-center mb-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">–</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={applyPriceFilter}
            className="w-full bg-amazon-yellow text-gray-900 text-sm py-1.5 rounded-full hover:bg-yellow-400 transition-colors font-medium"
          >
            Apply
          </button>
          <div className="mt-2 space-y-1">
            {[['Under $25', '0', '25'], ['$25 – $50', '25', '50'], ['$50 – $100', '50', '100'], ['$100 – $500', '100', '500'], ['$500+', '500', '']].map(([label, min, max]) => (
              <button
                key={label}
                onClick={() => {
                  const c = new URLSearchParams(params.toString())
                  c.set('page', '1')
                  if (min) c.set('minPrice', min); else c.delete('minPrice')
                  if (max) c.set('maxPrice', max); else c.delete('maxPrice')
                  router.push(`/products?${c.toString()}`)
                  setPriceRange({ min, max })
                }}
                className="block text-sm text-gray-700 hover:text-amazon-orange w-full text-left py-0.5"
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Customer Rating" sectionKey="rating">
          <div className="space-y-1">
            {[4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => updateFilter('minRating', String(r))}
                className={`flex items-center gap-1 text-sm w-full text-left py-0.5 ${params.get('minRating') === String(r) ? 'font-semibold' : 'text-gray-700 hover:text-amazon-orange'}`}
              >
                <StarRating rating={r} size="sm" /> <span>& Up</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Sort By" sectionKey="brand">
          <div className="space-y-1">
            {[
              ['Best Match', 'createdAt', 'desc'],
              ['Price: Low to High', 'price', 'asc'],
              ['Price: High to Low', 'price', 'desc'],
              ['Top Rated', 'rating', 'desc'],
              ['Most Reviews', 'reviewCount', 'desc'],
            ].map(([label, sort, order]) => (
              <button
                key={label}
                onClick={() => {
                  const c = new URLSearchParams(params.toString())
                  c.set('sort', sort)
                  c.set('order', order)
                  c.set('page', '1')
                  router.push(`/products?${c.toString()}`)
                }}
                className={`block text-sm w-full text-left py-0.5 ${params.get('sort') === sort && params.get('order') === order ? 'text-amazon-orange font-semibold' : 'text-gray-700 hover:text-amazon-orange'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  )
}
