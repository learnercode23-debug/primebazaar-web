'use client'

export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import { FiTrash2, FiHeart, FiShoppingCart, FiMinus, FiPlus, FiArrowRight } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function CartPage() {
  const { user } = useAuth()
  const { items, loading, removeFromCart, updateQuantity, subtotal } = useCart()
  const { toggleWishlist } = useWishlist()
  const router = useRouter()

  const shippingCost = subtotal > 50 ? 0 : 5.99
  const total = subtotal + shippingCost

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <FiShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Sign in to view your saved items.</p>
          <Link href="/login" className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-full transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSpinner fullPage />

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <FiShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your Amazon Cart is empty</h1>
          <p className="text-gray-500 mb-6">Your cart is empty. Continue shopping to add items.</p>
          <Link href="/products" className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-full transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart ({items.length} items)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.product as Product
            const price = product.discountPrice || product.price
            return (
              <div key={product._id} className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4">
                <Link href={`/products/${product._id}`} className="flex-shrink-0">
                  <div className="relative w-24 h-24 rounded bg-gray-50">
                    <Image src={product.images[0] || 'https://via.placeholder.com/200'} alt={product.title} fill className="object-contain p-1" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${product._id}`}>
                    <h3 className="font-medium text-gray-900 hover:text-amazon-orange line-clamp-2 text-sm">{product.title}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
                  {product.stock <= 5 && <p className="text-amazon-red text-xs mt-0.5">Only {product.stock} left!</p>}

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                    {/* Qty controls */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(product._id, item.quantity - 1)} className="px-2 py-1.5 hover:bg-gray-100 transition-colors">
                        <FiMinus className="text-xs" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-medium border-x border-gray-300">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(product._id, item.quantity + 1)}
                        disabled={item.quantity >= product.stock}
                        className="px-2 py-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
                      >
                        <FiPlus className="text-xs" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleWishlist(product._id)}
                        className="flex items-center gap-1 text-xs text-amazon-teal hover:underline"
                      >
                        <FiHeart /> Save for later
                      </button>
                      <button
                        onClick={() => removeFromCart(product._id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{formatPrice(price * item.quantity)}</p>
                  {product.discountPrice && (
                    <p className="text-xs text-gray-500">{formatPrice(price)} each</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-20">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className={subtotal > 50 ? 'text-amazon-green font-medium' : ''}>
                  {subtotal > 50 ? 'FREE' : formatPrice(shippingCost)}
                </span>
              </div>
              {subtotal < 50 && (
                <p className="text-xs text-gray-500">
                  Add {formatPrice(50 - subtotal)} more for free shipping
                </p>
              )}
            </div>
            <hr className="mb-4" />
            <div className="flex justify-between font-bold text-lg mb-5">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="w-full bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              Proceed to Checkout <FiArrowRight />
            </button>
            <Link href="/products" className="block text-center text-amazon-teal text-sm hover:underline mt-3">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
