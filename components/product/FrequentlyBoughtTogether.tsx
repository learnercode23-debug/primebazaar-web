'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import { FiPlus, FiShoppingCart } from 'react-icons/fi'

interface FBTProduct {
  _id: string
  title: string
  images: string[]
  price: number
  discountPrice?: number
  rating: number
  reviewCount: number
  stock: number
  brand: string
  slug?: string
}

interface FBTItem {
  product: FBTProduct
  confidence: number | null
  lift: number | null
  support: number | null
  coCount: number | null
  isFallback: boolean
}

interface FrequentlyBoughtTogetherProps {
  anchorProduct: {
    _id: string
    title: string
    images: string[]
    price: number
    discountPrice?: number
    rating: number
    reviewCount: number
  }
}

export default function FrequentlyBoughtTogether({ anchorProduct }: FrequentlyBoughtTogetherProps) {
  const { addToCart } = useCart()
  const [items, setItems] = useState<FBTItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)

  useEffect(() => {
    axios.get(`/api/products/${anchorProduct._id}/frequently-bought`)
      .then((r) => {
        const data: FBTItem[] = r.data.data || []
        setItems(data)
        // Select all by default (Amazon behaviour)
        setSelected(new Set(data.map((item) => item.product._id)))
      })
      .finally(() => setLoading(false))
  }, [anchorProduct._id])

  if (!loading && items.length === 0) return null

  const anchorPrice = anchorProduct.discountPrice || anchorProduct.price

  // Calculate combined price for selected items
  const selectedItems = items.filter((item) => selected.has(item.product._id))
  const totalPrice = anchorPrice + selectedItems.reduce((sum, item) => {
    return sum + (item.product.discountPrice || item.product.price)
  }, 0)

  const totalOriginalPrice = anchorProduct.price + selectedItems.reduce((sum, item) => {
    return sum + item.product.price
  }, 0)

  const totalSavings = totalOriginalPrice - totalPrice
  const itemCount = 1 + selectedItems.length

  function toggleSelect(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  async function addAllToCart() {
    setAddingAll(true)
    try {
      await addToCart(anchorProduct._id)
      for (const item of selectedItems) {
        await addToCart(item.product._id)
      }
      toast.success(`${itemCount} item${itemCount > 1 ? 's' : ''} added to cart!`)
    } finally {
      setAddingAll(false)
    }
  }

  // Best rule stats (highest lift, for the "why" tooltip)
  const bestRule = items.find((item) => !item.isFallback && item.confidence !== null)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="flex items-center gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 h-24 bg-gray-200 animate-pulse rounded-lg" />
              {i < 2 && <div className="w-6 h-6 bg-gray-200 animate-pulse rounded-full" />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const allProducts = [
    { product: { ...anchorProduct, stock: 1, brand: '' } as FBTProduct, isAnchor: true },
    ...items.map((item) => ({ ...item, isAnchor: false })),
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Frequently Bought Together</h2>
      {bestRule && !bestRule.isFallback && (
        <p className="text-xs text-gray-500 mb-4">
          Based on purchase patterns —{' '}
          <span className="font-semibold text-amazon-teal">
            {Math.round((bestRule.confidence || 0) * 100)}% of customers
          </span>{' '}
          who bought this also bought these items
          {bestRule.lift && bestRule.lift > 2 && (
            <span className="ml-1 text-amazon-green font-medium">(Lift: {bestRule.lift.toFixed(1)}×)</span>
          )}
        </p>
      )}
      {(!bestRule || bestRule.isFallback) && (
        <p className="text-xs text-gray-500 mb-4">Customers who view this item also view</p>
      )}

      {/* Product strip with + signs */}
      <div className="flex items-start gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {allProducts.map((entry, idx) => {
          const prod = entry.product
          const isAnchor = (entry as { isAnchor?: boolean }).isAnchor
          const isSelected = isAnchor || selected.has(prod._id)
          const price = prod.discountPrice || prod.price

          return (
            <div key={prod._id} className="flex items-center gap-2 flex-shrink-0">
              {/* Product card */}
              <div className={`relative flex flex-col items-center border-2 rounded-xl p-2 w-32 transition-all cursor-pointer ${isSelected ? 'border-amazon-orange bg-orange-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                onClick={() => !isAnchor && toggleSelect(prod._id)}
              >
                {/* Checkbox */}
                <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center z-10 ${isSelected ? 'bg-amazon-orange border-amazon-orange' : 'bg-white border-gray-300'}`}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                {isAnchor && (
                  <span className="absolute top-2 right-2 bg-amazon-orange text-white text-xs px-1 rounded font-bold leading-tight">
                    This
                  </span>
                )}

                <Link href={`/products/${prod._id}`} onClick={(e) => e.stopPropagation()}>
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white mb-1">
                    <Image
                      src={prod.images[0] || 'https://via.placeholder.com/160'}
                      alt={prod.title}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                </Link>

                <p className="text-xs text-gray-700 line-clamp-2 text-center leading-tight mb-1">
                  {prod.title}
                </p>
                <StarRating rating={prod.rating} size="sm" />
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPrice(price)}</p>
                {prod.discountPrice && (
                  <p className="text-xs text-gray-400 line-through">{formatPrice(prod.price)}</p>
                )}

                {/* Association stats badge */}
                {!isAnchor && !items.find(i => i.product._id === prod._id)?.isFallback && items.find(i => i.product._id === prod._id)?.confidence && (
                  <span className="mt-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    {Math.round((items.find(i => i.product._id === prod._id)?.confidence || 0) * 100)}% buy together
                  </span>
                )}
              </div>

              {/* + connector */}
              {idx < allProducts.length - 1 && (
                <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiPlus className="text-gray-500 text-sm font-bold" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Price total + Add to cart */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {itemCount} item{itemCount > 1 ? 's' : ''}: {formatPrice(totalPrice)}
              </span>
              {totalSavings > 0.5 && (
                <span className="text-sm text-amazon-green font-medium">
                  Save {formatPrice(totalSavings)}
                </span>
              )}
            </div>
            {totalSavings > 0.5 && (
              <p className="text-xs text-gray-400 line-through">{formatPrice(totalOriginalPrice)}</p>
            )}
          </div>

          <button
            onClick={addAllToCart}
            disabled={addingAll || itemCount === 0}
            className="flex items-center gap-2 bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm transition-colors"
          >
            {addingAll ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <FiShoppingCart />
                Add {itemCount > 1 ? `all ${itemCount}` : '1'} to Cart
              </>
            )}
          </button>
        </div>

        {/* Algorithm transparency badge */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-gray-700">Market Basket Analysis</span>
              {bestRule && !bestRule.isFallback && bestRule.lift && (
                <span className="text-gray-400"> · Apriori · Lift {bestRule.lift.toFixed(2)}×</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
