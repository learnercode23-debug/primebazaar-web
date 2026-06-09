'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import StarRating from '@/components/ui/StarRating'
import { FiCheck, FiX, FiShoppingCart, FiArrowLeft } from 'react-icons/fi'
import { useCart } from '@/contexts/CartContext'
import toast from 'react-hot-toast'

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToCart } = useCart()
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 4)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return }
    Promise.all(ids.map(id => axios.get(`/api/products/${id}`).then(r => r.data.data).catch(() => null)))
      .then(results => setProducts(results.filter(Boolean)))
      .finally(() => setLoading(false))
  }, [ids.join(',')])

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (products.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-bold">No products to compare</h2>
      <button onClick={() => router.back()} className="btn-gradient px-6 py-2.5 rounded-full text-sm font-bold">Go Back</button>
    </div>
  )

  // Collect all spec keys across all products
  const allSpecKeys = Array.from(new Set(products.flatMap(p => Object.keys((p as unknown as { specifications?: Record<string, string> }).specifications || {}))))

  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    { label: 'Price',    render: p => <span className="font-black text-lg text-gray-900">{formatPrice(p.discountPrice || p.price)}</span> },
    { label: 'Rating',  render: p => <div className="flex items-center gap-1"><StarRating rating={p.rating} size="sm" /><span className="text-xs text-gray-500">({p.reviewCount})</span></div> },
    { label: 'Brand',   render: p => <span className="font-medium text-gray-700">{p.brand || '—'}</span> },
    { label: 'Stock',   render: p => p.stock > 0
      ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><FiCheck /> In Stock</span>
      : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><FiX /> Out of Stock</span> },
    { label: 'Discount', render: p => p.discountPrice
      ? <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{p.discountPercent}% OFF</span>
      : <span className="text-gray-400 text-sm">—</span> },
    { label: 'Free Shipping', render: (p: unknown) => (p as { freeShipping?: boolean }).freeShipping
      ? <FiCheck className="text-emerald-600 text-lg" />
      : <FiX className="text-gray-300 text-lg" /> },
    ...allSpecKeys.slice(0, 8).map(key => ({
      label: key,
      render: (p: Product) => {
        const val = ((p as unknown as { specifications?: Record<string, string> }).specifications || {})[key]
        return <span className="text-sm text-gray-700">{val || <span className="text-gray-300">—</span>}</span>
      },
    })),
  ]

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <FiArrowLeft /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Compare Products</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          {/* Product images row */}
          <thead>
            <tr>
              <th className="w-32 sm:w-40 text-left pb-4 pr-4 text-sm font-semibold text-gray-500 align-top pt-2">Features</th>
              {products.map(p => (
                <th key={p._id} className="pb-4 px-3 align-top">
                  <div className="flex flex-col items-center gap-2">
                    <Link href={`/products/${p._id}`}>
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-50 border border-gray-200 hover:border-violet-400 transition-colors mx-auto">
                        <Image src={p.images?.[0] || 'https://via.placeholder.com/200'} alt={p.title} fill className="object-contain p-2" />
                      </div>
                    </Link>
                    <Link href={`/products/${p._id}`} className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-violet-700 line-clamp-2 text-center transition-colors">
                      {p.title}
                    </Link>
                    <button
                      onClick={() => { addToCart(p._id); toast.success('Added to cart!') }}
                      disabled={p.stock === 0}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${p.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'btn-gradient'}`}
                    >
                      <FiShoppingCart /> {p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Comparison rows */}
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                <td className="py-3 pr-4 text-xs font-bold text-gray-500 uppercase tracking-wide align-middle rounded-l-xl pl-3">
                  {row.label}
                </td>
                {products.map(p => (
                  <td key={p._id} className="py-3 px-3 text-center align-middle">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <CompareContent />
    </Suspense>
  )
}
