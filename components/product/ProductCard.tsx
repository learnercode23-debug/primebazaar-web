'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FiHeart, FiShoppingCart } from 'react-icons/fi'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  variant?: 'grid' | 'list'
}

export default function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
  const { addToCart, isInCart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()
  const inCart = isInCart(product._id)
  const wishlisted = isWishlisted(product._id)
  const price = product.discountPrice || product.price
  const hasDiscount = product.discountPrice && product.discountPrice < product.price

  /* ── List variant ─────────────────────────────────────────────────────── */
  if (variant === 'list') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 p-3 sm:p-4 flex gap-3 sm:gap-4 hover:shadow-purple transition-shadow">
        <Link href={`/products/${product._id}`} className="flex-shrink-0">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-50">
            <Image src={product.images[0] || 'https://via.placeholder.com/200'} alt={product.title} fill className="object-contain p-2" />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{product.brand}</p>
          <Link href={`/products/${product._id}`}>
            <h3 className="font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 text-sm sm:text-base mb-1">{product.title}</h3>
          </Link>
          <StarRating rating={product.rating} size="sm" showCount count={product.reviewCount} />
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base sm:text-lg font-bold text-gray-900">{formatPrice(price)}</span>
            {hasDiscount && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
            {hasDiscount && <span className="text-xs text-amazon-red font-bold">-{product.discountPercent}%</span>}
          </div>
          {product.stock <= 5 && product.stock > 0 && <p className="text-xs text-amazon-red mt-0.5">Only {product.stock} left!</p>}
          {product.stock === 0 && <p className="text-xs text-red-600 font-medium mt-0.5">Out of Stock</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => addToCart(product._id)}
              disabled={product.stock === 0}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-sm font-semibold transition-colors',
                inCart ? 'bg-green-100 text-green-700 border border-green-300'
                  : product.stock === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-amazon-yellow hover:bg-yellow-400 text-gray-900'
              )}
            >
              <FiShoppingCart className="text-sm" />
              {inCart ? 'In Cart' : 'Add to Cart'}
            </button>
            <button
              onClick={() => toggleWishlist(product._id)}
              className={cn(
                'p-2 rounded-full border transition-colors',
                wishlisted ? 'border-red-400 text-red-500 bg-red-50' : 'border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500'
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
    <div className="bg-white rounded-xl border border-brand-100 overflow-hidden hover:shadow-purple hover:border-brand-200 transition-all duration-200 group flex flex-col h-full">

      {/* Image + Badges */}
      <div className="relative">
        <Link href={`/products/${product._id}`}>
          <div className="relative h-36 sm:h-48 bg-gray-50 overflow-hidden">
            <Image
              src={product.images[0] || 'https://via.placeholder.com/400'}
              alt={product.title}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        </Link>

        {/* Only show ONE primary badge to avoid clutter */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {hasDiscount ? (
            <span className="bg-amazon-red text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              -{product.discountPercent}%
            </span>
          ) : product.isDealOfDay ? (
            <span className="bg-amber-500 text-gray-900 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              🔥 Deal
            </span>
          ) : product.isFeatured ? (
            <span className="bg-violet-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              ⭐ Top Pick
            </span>
          ) : null}
        </div>

        {/* Wishlist — always visible on mobile, hover on desktop */}
        <button
          onClick={() => toggleWishlist(product._id)}
          className={cn(
            'absolute top-2 right-2 p-2 rounded-full bg-white/90 shadow-sm border transition-all',
            wishlisted
              ? 'text-red-500 border-red-200'
              : 'text-gray-400 border-gray-200 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 hover:border-red-200'
          )}
          aria-label="Save to wishlist"
        >
          <FiHeart className={cn('text-sm', wishlisted ? 'fill-current' : '')} />
        </button>
      </div>

      {/* Content */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1">
        <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wide">{product.brand}</p>

        <Link href={`/products/${product._id}`}>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 leading-snug transition-colors">
            {product.title}
          </h3>
        </Link>

        <StarRating rating={product.rating} size="sm" showCount count={product.reviewCount} />

        {/* Countdown for deals */}
        {product.isDealOfDay && product.dealEndTime && (
          <div className="text-[10px]">
            <CountdownTimer endTime={product.dealEndTime} />
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-1.5 space-y-1.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-bold text-gray-900">{formatPrice(price)}</span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            {product.stock === 0 ? (
              <span className="text-red-500 font-semibold">Out of Stock</span>
            ) : product.stock <= 5 ? (
              <span className="text-amber-600 font-medium">Only {product.stock} left!</span>
            ) : (
              <span className="text-amazon-green font-medium">✓ In Stock</span>
            )}
          </div>

          <button
            onClick={() => addToCart(product._id)}
            disabled={product.stock === 0}
            className={cn(
              'w-full text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5',
              inCart
                ? 'bg-green-100 text-green-700 border border-green-300'
                : product.stock === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-amazon-yellow hover:bg-yellow-400 text-gray-900 shadow-sm hover:shadow-md'
            )}
          >
            <FiShoppingCart className="text-xs sm:text-sm flex-shrink-0" />
            <span>{inCart ? 'In Cart' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
