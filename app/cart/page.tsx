'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import { FiTrash2, FiHeart, FiShoppingCart, FiMinus, FiPlus, FiArrowRight, FiTag, FiX } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProductCard from '@/components/product/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

function CartRecommendations({ productIds }: { productIds: string[] }) {
  const { addToCart } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!productIds.length) { setLoading(false); return }
    const firstId = productIds[0]
    if (!firstId) { setLoading(false); return }
    axios.get(`/api/products/${firstId}/recommendations`)
      .then((r) => {
        const recs: Product[] = r.data.data || []
        setProducts(recs.filter((p) => p?._id && !productIds.includes(p._id)).slice(0, 4))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds[0]])

  async function handleAdd(productId: string) {
    setAdding(productId)
    try {
      await addToCart(productId)
      toast.success('Added to cart!')
    } finally {
      setAdding(null)
    }
  }

  if (!loading && products.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-violet-600 rounded-full" />
        Customers who bought items in your cart also bought
      </h2>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p._id} className="relative group">
              <ProductCard product={p} />
              <button
                onClick={() => handleAdd(p._id)}
                disabled={adding === p._id}
                className="absolute bottom-14 left-2 right-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              >
                {adding === p._id ? '…' : '+ Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CartPage() {
  const { user } = useAuth()
  const { items, loading, removeFromCart, updateQuantity, subtotal } = useCart()
  const { toggleWishlist } = useWishlist()
  const router = useRouter()

  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; discountType: string; discountValue: number } | null>(null)

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await axios.post('/api/coupons/validate', { code: couponCode.trim(), subtotal })
      setAppliedCoupon(res.data.data)
      toast.success(`Coupon applied! You save ${formatPrice(res.data.data.discount)}`)
      setCouponCode('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid coupon'
      toast.error(msg)
    } finally {
      setCouponLoading(false)
    }
  }

  const couponDiscount = appliedCoupon?.discount || 0
  const shippingCost = subtotal > 999 ? 0 : 99
  const total = subtotal + shippingCost - couponDiscount

  const cartProductIds = items
    .map((i) => { const p = i.product as Product; return p?._id || null })
    .filter(Boolean) as string[]

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <FiShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Sign in to view your cart.</p>
          <Link href="/login" className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3 rounded-full transition-colors">
            Sign In
          </Link>
          <Link href="/products" className="block mt-3 text-violet-600 hover:underline text-sm font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingSpinner fullPage />

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShoppingCart className="text-3xl text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your PrimePasal Cart is empty</h1>
          <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
          <Link
            href="/products"
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3 rounded-full transition-colors inline-flex items-center gap-2"
          >
            Start Shopping <FiArrowRight />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Shopping Cart <span className="text-gray-400 font-normal text-lg">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.product as Product
            const price = product.discountPrice || product.price
            return (
              <div key={product._id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                <Link href={`/products/${product._id}`} className="flex-shrink-0">
                  <div className="relative w-24 h-24 rounded-lg bg-gray-50">
                    <Image src={product.images[0] || 'https://via.placeholder.com/200'} alt={product.title} fill className="object-contain p-1" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${product._id}`}>
                    <h3 className="font-medium text-gray-900 hover:text-violet-600 line-clamp-2 text-sm">{product.title}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
                  {product.stock <= 5 && (
                    <p className="text-red-500 text-xs mt-0.5 font-medium">Only {product.stock} left in stock!</p>
                  )}

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                    {/* Qty controls */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(product._id, item.quantity - 1)}
                        className="px-2 py-1.5 hover:bg-gray-100 transition-colors"
                      >
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
                        className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
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
                    <p className="text-xs text-gray-400 line-through">{formatPrice(product.price * item.quantity)}</p>
                  )}
                  {product.discountPrice && (
                    <p className="text-xs text-green-600 font-medium">
                      Save {formatPrice((product.price - price) * item.quantity)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className={subtotal > 999 ? 'text-green-600 font-medium' : ''}>
                  {subtotal > 999 ? 'FREE' : formatPrice(shippingCost)}
                </span>
              </div>
              {subtotal < 999 && (
                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Add <strong>{formatPrice(999 - subtotal)}</strong> more for free shipping
                </p>
              )}
            </div>
            {/* Coupon code */}
            <div className="mb-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FiTag className="text-emerald-600" />
                    <span className="font-bold text-emerald-700">{appliedCoupon.code}</span>
                    <span className="text-emerald-600">−{formatPrice(appliedCoupon.discount)}</span>
                  </div>
                  <button onClick={() => setAppliedCoupon(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <FiX />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    placeholder="Coupon code"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            <hr className="mb-4" />
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-emerald-600 font-semibold mb-2">
                <span>Coupon Discount</span>
                <span>−{formatPrice(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl mb-5">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2 shadow-md shadow-violet-200"
            >
              Proceed to Checkout <FiArrowRight />
            </button>
            <Link href="/products" className="block text-center text-violet-600 text-sm hover:underline mt-3">
              Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: '🔒', text: 'Secure checkout' },
                { icon: '↩️', text: 'Easy returns' },
                { icon: '🚚', text: 'Fast delivery' },
              ].map((b) => (
                <div key={b.text} className="text-xs text-gray-500">
                  <div className="text-lg mb-0.5">{b.icon}</div>
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customers also bought — powered by collaborative filtering */}
      {cartProductIds.length > 0 && (
        <CartRecommendations productIds={cartProductIds} />
      )}
    </div>
  )
}
