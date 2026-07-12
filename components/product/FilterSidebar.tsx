'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi'
import { CATEGORIES } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'

const PRICE_MIN = 0
const PRICE_MAX = 100000

function fmt(n: number) {
  return `Rs.${n.toLocaleString('en-IN')}`
}

export default function FilterSidebar() {
  const router = useRouter()
  const params = useSearchParams()
  const [openSections, setOpenSections] = useState({ category: true, price: true, rating: true, brand: false, sort: false })
  const [brandInput, setBrandInput] = useState(params.get('brand') || '')
  const [minVal, setMinVal] = useState(Number(params.get('minPrice') || PRICE_MIN))
  const [maxVal, setMaxVal] = useState(Number(params.get('maxPrice') || PRICE_MAX))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function applyPriceFilter(min: number, max: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const current = new URLSearchParams(params.toString())
      current.set('page', '1')
      if (min > PRICE_MIN) current.set('minPrice', String(min)); else current.delete('minPrice')
      if (max < PRICE_MAX) current.set('maxPrice', String(max)); else current.delete('maxPrice')
      router.push(`/products?${current.toString()}`)
    }, 400)
  }

  function clearFilters() {
    const search = params.get('search')
    router.push(search ? `/products?search=${encodeURIComponent(search)}` : '/products')
    setMinVal(PRICE_MIN)
    setMaxVal(PRICE_MAX)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const hasFilters = params.get('category') || params.get('minPrice') || params.get('maxPrice') || params.get('minRating') || params.get('brand') || params.get('hasDiscount') || params.get('inStock') || params.get('newArrivals')
  const minPct = (minVal / PRICE_MAX) * 100
  const maxPct = (maxVal / PRICE_MAX) * 100

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

        {/* Quick toggles */}
        <div className="py-3 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quick Filters</p>
          <div className="flex flex-col gap-1.5">
            {([
              { label: '🔖 On Sale', key: 'hasDiscount', value: 'true' },
              { label: '📦 In Stock', key: 'inStock',     value: 'true' },
              { label: '🆕 New Arrivals', key: 'newArrivals', value: 'true' },
            ] as { label: string; key: string; value: string }[]).map(({ label, key, value }) => {
              const active = params.get(key) === value
              return (
                <button
                  key={key}
                  onClick={() => updateFilter(key, active ? null : value)}
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all text-left ${
                    active ? 'bg-violet-600 text-white border-violet-600 font-semibold' : 'border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-white border-white' : 'border-gray-300'}`}>
                    {active && <svg className="w-2.5 h-2.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
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

        <Section title="Price" sectionKey="price">
          {/* Live label */}
          <p className="text-sm font-semibold text-gray-800 mb-4">
            {fmt(minVal)} – {fmt(maxVal)}
          </p>

          {/* Dual range slider */}
          <div className="relative h-6 mb-5 select-none">
            {/* Grey track */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full" />
            {/* Blue fill */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-500 rounded-full"
              style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, transition: 'left 0.15s ease, right 0.15s ease' }}
            />

            {/* Min range input */}
            <input
              type="range"
              min={PRICE_MIN} max={PRICE_MAX} step={500}
              value={minVal}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), maxVal - 500)
                setMinVal(v)
                applyPriceFilter(v, maxVal)
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ zIndex: minVal > PRICE_MAX * 0.9 ? 5 : 3 }}
            />
            {/* Max range input */}
            <input
              type="range"
              min={PRICE_MIN} max={PRICE_MAX} step={500}
              value={maxVal}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), minVal + 500)
                setMaxVal(v)
                applyPriceFilter(minVal, v)
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ zIndex: 4 }}
            />

            {/* Min handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-[3px] border-blue-600 rounded-full shadow-md pointer-events-none"
              style={{ left: `calc(${minPct}% - 10px)`, transition: 'left 0.15s ease' }}
            />
            {/* Max handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-[3px] border-blue-600 rounded-full shadow-md pointer-events-none"
              style={{ left: `calc(${maxPct}% - 10px)`, transition: 'left 0.15s ease' }}
            />
          </div>

          {/* Quick presets */}
          <div className="space-y-1">
            {([
              ['Under Rs.500',      0,     500],
              ['Rs.500 – 1,000',    500,   1000],
              ['Rs.1,000 – 5,000',  1000,  5000],
              ['Rs.5,000 – 20,000', 5000,  20000],
              ['Rs.20,000+',        20000, PRICE_MAX],
            ] as [string, number, number][]).map(([label, min, max]) => (
              <button
                key={label}
                onClick={() => {
                  setMinVal(min)
                  setMaxVal(max)
                  applyPriceFilter(min, max)
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

        <Section title="Brand" sectionKey="brand">
          <div className="space-y-2">
            <input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter('brand', brandInput.trim() || null)
              }}
              placeholder="Search brand…"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            {brandInput && (
              <button
                onClick={() => updateFilter('brand', brandInput.trim())}
                className="w-full py-1.5 text-xs font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Filter by &quot;{brandInput}&quot;
              </button>
            )}
            {params.get('brand') && (
              <button onClick={() => { updateFilter('brand', null); setBrandInput('') }} className="text-xs text-red-500 hover:underline">
                ✕ Clear brand filter
              </button>
            )}
          </div>
        </Section>

        <Section title="Sort By" sectionKey="sort">
          <div className="space-y-1">
            {[
              ['Best Sellers',        'salesCount',  'desc'],
              ['Top Rated',           'rating',      'desc'],
              ['Price: Low to High',  'price',       'asc'],
              ['Price: High to Low',  'price',       'desc'],
              ['Most Reviews',        'reviewCount', 'desc'],
              ['Newest First',        'createdAt',   'desc'],
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
