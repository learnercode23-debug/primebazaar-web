'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { useCart } from '@/contexts/CartContext'
import { FiZap, FiShoppingCart } from 'react-icons/fi'

export default function DealOfTheDay() {
  const [deals, setDeals] = useState<Product[]>([])
  const { addToCart } = useCart()

  useEffect(() => {
    axios.get('/api/products?dealOfDay=true&limit=4').then((r) => setDeals(r.data.data || [])).catch(() => {})
  }, [])

  if (!deals.length) return null

  return (
    <section className="bg-white rounded-2xl border border-brand-100 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <FiZap className="text-white text-lg" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-gray-900">Deal of the Day</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Updated daily — don&apos;t miss out</p>
          </div>
        </div>
        <Link href="/products?dealOfDay=true" className="text-brand-600 text-xs sm:text-sm hover:underline font-semibold">
          See all →
        </Link>
      </div>

      {/* Mobile: 2×2 grid. Desktop: 4 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {deals.map((product) => {
          const price = product.discountPrice || product.price
          return (
            <div key={product._id} className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all hover:border-amber-300 flex flex-col">
              <Link href={`/products/${product._id}`}>
                <div className="relative h-28 sm:h-36 mb-2 rounded-lg bg-white overflow-hidden">
                  <Image
                    src={product.images[0] || 'https://via.placeholder.com/200'}
                    alt={product.title}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 45vw, 25vw"
                  />
                  {product.discountPercent && (
                    <span className="absolute top-1.5 left-1.5 bg-amazon-red text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md">
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
              </Link>

              <Link href={`/products/${product._id}`}>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 mb-1 leading-snug transition-colors">
                  {product.title}
                </h3>
              </Link>

              <StarRating rating={product.rating} size="sm" />

              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-sm sm:text-base font-bold text-gray-900">{formatPrice(price)}</span>
                {product.discountPrice && (
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                )}
              </div>

              {product.dealEndTime && (
                <div className="text-[10px] mt-1">
                  <CountdownTimer endTime={product.dealEndTime} />
                </div>
              )}

              <button
                onClick={() => addToCart(product._id)}
                className="w-full mt-2 bg-amazon-yellow hover:bg-yellow-400 text-gray-900 text-xs sm:text-sm font-bold py-2 rounded-full transition-colors flex items-center justify-center gap-1.5 mt-auto"
              >
                <FiShoppingCart className="text-xs" />
                Add to Cart
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
