'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FiHeart, FiShoppingCart, FiCheckCircle, FiEye } from 'react-icons/fi'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useCompare } from '@/contexts/CompareContext'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
  variant?: 'grid' | 'list'
}

export default function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
  const { addToCart, isInCart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()
  const { addToCompare, removeFromCompare, isInCompare } = useCompare()
  const inCart = isInCart(product._id)
  const wishlisted = isWishlisted(product._id)
  const inCompare = isInCompare(product._id)
  const price = product.discountPrice || product.price
  const hasDiscount = product.discountPrice && product.discountPrice < product.price
  const savings = hasDiscount ? Math.round(product.price - product.discountPrice!) : 0
  const [bouncing, setBouncing] = useState(false)
  const [wishAnim, setWishAnim] = useState(false)

  function handleAddToCart() {
    if (product.stock === 0) return
    addToCart(product._id)
    setBouncing(true)
    setTimeout(() => setBouncing(false), 450)
  }

  function handleWishlist() {
    toggleWishlist(product._id)
    setWishAnim(true)
    setTimeout(() => setWishAnim(false), 400)
  }

  /* ── List variant ─────────────────────────────────────────────────────── */
  if (variant === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex gap-3 sm:gap-4 hover:shadow-lg hover:shadow-violet-100 hover:border-violet-200 transition-all duration-300 group card-shine">
        <Link href={`/products/${product._id}`} className="flex-shrink-0">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gradient-to-br from-violet-50 to-indigo-50">
            <Image src={product.images[0] || 'https://via.placeholder.com/200'} alt={product.title} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-400" />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          {product.brand && <p className="text-[10px] text-violet-500 font-bold uppercase tracking-widest mb-0.5">{product.brand}</p>}
          <Link href={`/products/${product._id}`}>
            <h3 className="font-semibold text-gray-900 hover:text-violet-700 line-clamp-2 text-sm sm:text-base mb-1 transition-colors">{product.title}</h3>
          </Link>
          <StarRating rating={product.rating} size="sm" showCount count={product.reviewCount} />
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <span className="text-base sm:text-lg font-black text-gray-900">{formatPrice(price)}</span>
            {hasDiscount && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
            {hasDiscount && <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Save {formatPrice(savings)}</span>}
          </div>
          {product.stock <= 5 && product.stock > 0 && <p className="text-xs text-amber-600 font-medium mt-1">Only {product.stock} left!</p>}
          {product.stock === 0 && <p className="text-xs text-red-500 font-semibold mt-1">Out of Stock</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-all press-effect',
                inCart ? 'bg-emerald-500 text-white shadow-sm'
                  : product.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'btn-gradient',
                bouncing && 'animate-cart-bounce'
              )}
            >
              <FiShoppingCart className="text-sm" />
              {inCart ? '✓ Added' : 'Add to Cart'}
            </button>
            <button
              onClick={handleWishlist}
              className={cn(
                'p-2 rounded-full border transition-all press-effect',
                wishlisted ? 'border-red-300 text-red-500 bg-red-50 shadow-sm' : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50',
                wishAnim && 'animate-bounce-in'
              )}
            >
              <FiHeart className={cn('text-sm', wishlisted ? 'fill-current' : '')} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Grid variant ─────────────────────────────────────────────────────── */
  return (
    <div className="gradient-border bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full card-shine">

      {/* Image */}
      <div className="relative overflow-hidden">
        <Link href={`/products/${product._id}`}>
          <div className="relative h-44 sm:h-56 bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden">
            <Image
              src={product.images[0] || 'https://via.placeholder.com/400'}
              alt={product.title}
              fill
              className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
              <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <FiEye className="text-violet-600" /> Quick View
              </span>
            </div>
          </div>
        </Link>

        {/* Badge */}
        <div className="absolute top-2.5 left-2.5">
          {hasDiscount ? (
            <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md">
              -{product.discountPercent}%
            </span>
          ) : product.isDealOfDay ? (
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md">
              🔥 Deal
            </span>
          ) : product.isFeatured ? (
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md">
              ⭐ Top Pick
            </span>
          ) : null}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={cn(
            'absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md border transition-all press-effect',
            wishlisted
              ? 'bg-red-500 text-white border-red-400'
              : 'bg-white/90 backdrop-blur-sm text-gray-400 border-white/80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200',
            wishAnim && 'animate-bounce-in'
          )}
          aria-label="Save to wishlist"
        >
          <FiHeart className={cn('text-xs', wishlisted ? 'fill-current' : '')} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">

        {product.isFeatured && (
          <p className="text-[10px] text-gray-400 leading-none">Sponsored</p>
        )}
        {product.brand && (
          <p className="text-[10px] text-violet-500 font-bold uppercase tracking-widest leading-none">{product.brand}</p>
        )}

        <Link href={`/products/${product._id}`}>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 hover:text-violet-700 line-clamp-2 leading-snug transition-colors">
            {product.title}
          </h3>
        </Link>

        <StarRating rating={product.rating} size="sm" showCount count={product.reviewCount} />

        {product.isDealOfDay && product.dealEndTime && (
          <div className="text-[10px]">
            <CountdownTimer endTime={product.dealEndTime} />
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 space-y-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-gray-900">{formatPrice(price)}</span>
            {hasDiscount && (
              <>
                <span className="text-[10px] sm:text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">Save {formatPrice(savings)}</span>
              </>
            )}
          </div>

          {/* Stock indicator */}
          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            {product.stock === 0 ? (
              <span className="text-red-500 font-semibold">Out of Stock</span>
            ) : product.stock <= 5 ? (
              <span className="text-amber-600 font-semibold animate-pulse">⚡ Only {product.stock} left!</span>
            ) : (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <FiCheckCircle className="text-xs flex-shrink-0" /> In Stock
              </span>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={cn(
              'w-full text-xs sm:text-sm font-bold py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 press-effect',
              inCart
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                : product.stock === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'btn-gradient',
              bouncing && 'animate-cart-bounce'
            )}
          >
            <FiShoppingCart className="text-xs sm:text-sm flex-shrink-0" />
            <span>{inCart ? '✓ Added to Cart' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>

          {/* Compare button */}
          <button
            onClick={() => inCompare ? removeFromCompare(product._id) : addToCompare(product)}
            className={cn(
              'w-full text-[10px] sm:text-xs py-1.5 rounded-full border transition-all press-effect font-semibold',
              inCompare
                ? 'border-violet-400 bg-violet-50 text-violet-700'
                : 'border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-600'
            )}
          >
            {inCompare ? '✓ In Compare' : '+ Compare'}
          </button>
        </div>
      </div>
    </div>
  )
}
