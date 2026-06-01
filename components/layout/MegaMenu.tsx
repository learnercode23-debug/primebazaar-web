'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { FiChevronRight, FiMenu } from 'react-icons/fi'

interface Category {
  _id: string
  name: string
  slug: string
  icon?: string
  children?: Category[]
}

export default function MegaMenu() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/categories?tree=true').then((r) => {
      setCategories(r.data.data || [])
      if (r.data.data?.[0]) setActive(r.data.data[0]._id)
    })
  }, [])

  const activeCategory = categories.find((c) => c._id === active)

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onMouseEnter={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-medium text-white hover:bg-white/10 px-2 py-1 rounded whitespace-nowrap h-10"
      >
        <FiMenu /> All Categories
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 flex shadow-2xl rounded-b-xl overflow-hidden bg-white border border-gray-100 min-h-64"
          onMouseEnter={() => setOpen(true)}>
          {/* Left: root categories */}
          <div className="w-52 bg-amazon-dark py-2">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onMouseEnter={() => setActive(cat._id)}
                onClick={() => { setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${active === cat._id ? 'bg-amazon-blue text-white' : 'text-gray-200 hover:bg-amazon-blue'}`}
              >
                <span className="flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </span>
                {(cat.children?.length ?? 0) > 0 && <FiChevronRight className="text-xs" />}
              </button>
            ))}
          </div>

          {/* Right: subcategories */}
          {activeCategory && (activeCategory.children?.length ?? 0) > 0 && (
            <div className="flex-1 p-4 min-w-56">
              <Link
                href={`/products?category=${encodeURIComponent(activeCategory.name)}`}
                onClick={() => setOpen(false)}
                className="block font-bold text-gray-900 text-sm mb-3 hover:text-amazon-orange"
              >
                {activeCategory.icon} {activeCategory.name}
              </Link>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {activeCategory.children?.map((sub) => (
                  <Link
                    key={sub._id}
                    href={`/products?category=${encodeURIComponent(activeCategory.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                    onClick={() => setOpen(false)}
                    className="text-sm text-gray-600 hover:text-amazon-orange hover:underline py-0.5 transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
              <Link
                href={`/products?category=${encodeURIComponent(activeCategory.name)}`}
                onClick={() => setOpen(false)}
                className="block mt-3 text-xs text-amazon-teal hover:underline"
              >
                See all in {activeCategory.name} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
