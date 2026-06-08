'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Product, Review } from '@/types'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import CountdownTimer from '@/components/ui/CountdownTimer'
import ReviewCard from '@/components/product/ReviewCard'
import ImageGallery from '@/components/product/ImageGallery'
import ProductVariants from '@/components/product/ProductVariants'
import ProductQASection from '@/components/product/ProductQASection'
import Recommendations from '@/components/product/Recommendations'
import RecentlyViewed from '@/components/product/RecentlyViewed'
import FrequentlyBoughtTogether from '@/components/product/FrequentlyBoughtTogether'
import { ProductDetailSkeleton } from '@/components/ui/Skeleton'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  FiShoppingCart, FiHeart, FiShare2, FiTruck, FiShield,
  FiRefreshCw, FiStar, FiMinus, FiPlus, FiCheck, FiZap,
  FiMessageCircle, FiX, FiSend, FiCopy,
} from 'react-icons/fi'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface IVariant {
  _id?: string
  attributes: Record<string, string>
  price: number
  discountPrice?: number
  stock: number
  images: string[]
}

interface ExpandedProduct extends Product {
  featureBullets?: string[]
  hasVariants?: boolean
  variants?: IVariant[]
  freeShipping?: boolean
  shippingCost?: number
  estimatedDeliveryDays?: number
  isLightningDeal?: boolean
  lightningDealEndTime?: string
  videoUrl?: string
  qaCount?: number
  salesCount?: number
  viewCount?: number
}

export default function ProductDetailPage() {
  const { id } = useParams() as { id: string }
  const { user } = useAuth()
  const { addToCart, isInCart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()
  const router = useRouter()

  const [product, setProduct] = useState<ExpandedProduct | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<IVariant | null>(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'qa'>('description')
  const [chatOpen, setChatOpen]       = useState(false)
  const [chatMsg, setChatMsg]         = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [shareOpen, setShareOpen]     = useState(false)
  const [stockAlertEmail, setStockAlertEmail]   = useState('')
  const [stockAlertLoading, setStockAlertLoading] = useState(false)
  const [stockAlertDone, setStockAlertDone]     = useState(false)

  function handleShare() {
    const url = `https://primepasal.com/products/${id}`
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      navigator.share({ title: product?.title || '', url }).catch(() => setShareOpen(true))
    } else {
      setShareOpen((o) => !o)
    }
  }

  async function subscribeStockAlert(e: React.FormEvent) {
    e.preventDefault()
    setStockAlertLoading(true)
    try {
      await axios.post(`/api/products/${id}/stock-alert`, { email: stockAlertEmail })
      setStockAlertDone(true)
      toast.success("We'll notify you when it's back in stock!")
    } catch {
      toast.error('Failed. Please try again.')
    } finally {
      setStockAlertLoading(false)
    }
  }

  async function startChat() {
    if (!user) { router.push('/login'); return }
    if (!chatMsg.trim()) return
    setChatSending(true)
    try {
      const sellerId = typeof product!.seller === 'string'
        ? product!.seller
        : (product!.seller as { _id?: string })?._id
      const res = await axios.post('/api/messages', {
        sellerId,
        productId: product!._id,
        message:   chatMsg.trim(),
      })
      router.push(`/messages/${res.data.data.conversationId}`)
    } catch {
      toast.error('Failed to start chat')
    } finally {
      setChatSending(false)
    }
  }

  const trackView = useCallback(async () => {
    await axios.post('/api/recently-viewed', { productId: id }).catch(() => {})
  }, [id])

  useEffect(() => {
    Promise.all([
      axios.get(`/api/products/${id}`),
      axios.get(`/api/reviews/${id}`),
    ]).then(([p, r]) => {
      const prod = p.data.data as ExpandedProduct
      setProduct(prod)
      setReviews(r.data.data || [])
      if (prod.hasVariants && prod.variants?.length) {
        setSelectedVariant(prod.variants[0])
      }
    }).catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false))
    trackView()
  }, [id, trackView])

  async function handleAddToCart() {
    if (!product) return
    await addToCart(product._id, quantity)
  }

  async function handleBuyNow() {
    if (!user) { router.push('/login'); return }
    await addToCart(product!._id, quantity)
    router.push('/checkout')
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { toast.error('Please login to leave a review'); return }
    setSubmittingReview(true)
    try {
      const res = await axios.post('/api/reviews', { productId: id, ...reviewForm })
      setReviews((p) => [res.data.data, ...p])
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', comment: '' })
      toast.success('Review submitted!')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <ProductDetailSkeleton />

  if (!product) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
        <button onClick={() => router.back()} className="text-amazon-teal hover:underline">← Go back</button>
      </div>
    </div>
  )

  const activeVariantPrice = selectedVariant?.discountPrice || selectedVariant?.price
  const price = activeVariantPrice || product.discountPrice || product.price
  const originalPrice = selectedVariant?.price || product.price
  const hasDiscount = price < originalPrice
  const stock = selectedVariant ? selectedVariant.stock : product.stock
  const images = (selectedVariant?.images?.length ? selectedVariant.images : product.images) || []
  const inCart = isInCart(product._id)
  const wishlisted = isWishlisted(product._id)
  const seller = product.seller as { name?: string } | string
  const sellerName = typeof seller === 'string' ? seller : seller?.name || 'Unknown'
  const category = typeof product.category === 'string' ? { name: product.category, slug: product.category } : product.category as { name: string; slug: string }
  const discountPct = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    pct: reviews.length ? Math.round((reviews.filter((rev) => rev.rating === r).length / reviews.length) * 100) : 0,
  }))

  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + (product.estimatedDeliveryDays || 5))

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: category?.name || 'Products', href: `/products?category=${encodeURIComponent(category?.name || '')}` },
        { label: product.title },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Images */}
        <div className="lg:col-span-4">
          <ImageGallery images={images} title={product.title} />
        </div>

        {/* Product info */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/products?brand=${encodeURIComponent(product.brand)}`} className="text-sm text-amazon-teal hover:underline font-medium">
              {product.brand}
            </Link>
            {product.isFeatured && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">Featured</span>}
          </div>

          <h1 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3 leading-snug">{product.title}</h1>

          <div className="flex items-center gap-3 mb-3">
            <StarRating rating={product.rating} size="md" />
            <a href="#reviews" onClick={() => setActiveTab('reviews')} className="text-amazon-teal text-sm hover:underline">
              {product.reviewCount.toLocaleString()} ratings
            </a>
            {product.salesCount && product.salesCount > 100 && (
              <span className="text-xs text-gray-500">{product.salesCount.toLocaleString()}+ sold</span>
            )}
          </div>

          <hr className="my-3" />

          {/* Price block */}
          <div className="mb-3">
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs bg-amazon-red text-white font-bold px-2 py-0.5 rounded">-{discountPct}%</span>
                <span className="text-gray-500 text-sm line-through">{formatPrice(originalPrice)}</span>
              </div>
            )}
            <span className="text-3xl font-bold text-gray-900">{formatPrice(price)}</span>
            {product.freeShipping ? (
              <p className="text-amazon-green text-sm mt-1 flex items-center gap-1">
                <FiTruck className="text-xs" /> FREE delivery
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                Delivery: <span className="font-medium">{formatPrice(product.shippingCost || 99)}</span>
              </p>
            )}
          </div>

          {/* Lightning deal */}
          {product.isLightningDeal && product.lightningDealEndTime && (
            <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-lg p-3 mb-3 flex items-center gap-3">
              <FiZap className="text-xl flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">⚡ Lightning Deal</p>
                <CountdownTimer endTime={product.lightningDealEndTime} />
              </div>
            </div>
          )}

          {/* Deal of day */}
          {product.isDealOfDay && product.dealEndTime && !product.isLightningDeal && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
              <p className="text-xs font-bold text-orange-700 mb-1">Deal of the Day</p>
              <CountdownTimer endTime={product.dealEndTime} />
            </div>
          )}

          {/* Variants */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <div className="mb-4">
              <ProductVariants
                variants={product.variants}
                selected={selectedVariant}
                onSelect={setSelectedVariant}
              />
            </div>
          )}

          {/* Stock */}
          <div className="mb-3">
            {stock === 0 ? (
              <div>
                <p className="text-red-600 font-semibold">Out of Stock</p>
                {!stockAlertDone ? (
                  <form onSubmit={subscribeStockAlert} className="mt-2 flex gap-2">
                    <input
                      type="email"
                      value={stockAlertEmail}
                      onChange={(e) => setStockAlertEmail(e.target.value)}
                      placeholder="Get notified when back in stock"
                      className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                      required
                    />
                    <button
                      type="submit"
                      disabled={stockAlertLoading}
                      className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap disabled:opacity-60"
                    >
                      {stockAlertLoading ? '…' : 'Notify Me'}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <FiCheck className="text-xs" /> You&apos;ll be notified when back in stock!
                  </p>
                )}
              </div>
            ) : stock <= 5 ? (
              <p className="text-amazon-red font-medium">Only {stock} left in stock – order soon</p>
            ) : (
              <p className="text-amazon-green font-medium">In Stock</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Estimated delivery: {deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Feature bullets */}
          {product.featureBullets && product.featureBullets.length > 0 && (
            <ul className="mb-4 space-y-1">
              {product.featureBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <FiCheck className="text-amazon-green flex-shrink-0 mt-0.5" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}

          {/* Quantity */}
          {stock > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700">Qty:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setQuantity((p) => Math.max(1, p - 1))} className="px-3 py-2 hover:bg-gray-100 transition-colors">
                  <FiMinus className="text-sm" />
                </button>
                <span className="px-4 py-2 text-sm font-medium border-x border-gray-300">{quantity}</span>
                <button onClick={() => setQuantity((p) => Math.min(stock, p + 1))} className="px-3 py-2 hover:bg-gray-100 transition-colors">
                  <FiPlus className="text-sm" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <button
              onClick={handleAddToCart}
              disabled={stock === 0}
              className={cn(
                'w-full py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2',
                inCart ? 'bg-green-500 text-white' : 'bg-amazon-yellow hover:bg-yellow-400 text-gray-900',
                stock === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <FiShoppingCart /> {inCart ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={stock === 0}
              className="w-full bg-amazon-orange hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-full font-bold text-sm transition-colors"
            >
              Buy Now
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => toggleWishlist(product._id)}
              className={cn(
                'flex items-center gap-1 text-sm transition-colors',
                wishlisted ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              )}
            >
              <FiHeart className={wishlisted ? 'fill-current' : ''} />
              {wishlisted ? 'Saved' : 'Add to Wishlist'}
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <FiMessageCircle /> Chat with Seller
            </button>
            <div className="relative">
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <FiShare2 /> Share
              </button>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 min-w-[180px] z-20">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://primepasal.com/products/${id}`)
                        toast.success('Link copied!')
                        setShareOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded-lg flex items-center gap-2"
                    >
                      <FiCopy className="text-gray-500" /> Copy Link
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent((product?.title || '') + '\nhttps://primepasal.com/products/' + id)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="px-3 py-2 text-xs hover:bg-gray-50 rounded-lg flex items-center gap-2 block"
                    >
                      <span className="text-green-500">💬</span> WhatsApp
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://primepasal.com/products/' + id)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="px-3 py-2 text-xs hover:bg-gray-50 rounded-lg flex items-center gap-2 block"
                    >
                      <span className="text-blue-500">📘</span> Facebook
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Buy box sidebar */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-20 space-y-3">
            <p className="text-2xl font-bold text-gray-900">{formatPrice(price)}</p>
            {product.freeShipping ? (
              <p className="text-sm text-amazon-green flex items-center gap-1">
                <FiTruck className="text-xs" /> FREE delivery on this item
              </p>
            ) : null}
            <p className="text-sm text-gray-600">
              Sold by <span className="font-medium text-amazon-teal">{sellerName}</span>
            </p>

            <hr />

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2"><FiShield className="flex-shrink-0 mt-0.5" /> Secure transaction</div>
              <div className="flex items-start gap-2"><FiRefreshCw className="flex-shrink-0 mt-0.5" /> 30-day return policy</div>
              <div className="flex items-start gap-2"><FiTruck className="flex-shrink-0 mt-0.5" /> Ships from Primepasal warehouse</div>
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 6).map((tag) => (
                    <Link
                      key={tag}
                      href={`/products?search=${encodeURIComponent(tag)}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div id="reviews" className="mt-10">
        <div className="border-b border-gray-200 flex gap-6 overflow-x-auto scrollbar-hide">
          {([
            ['description', 'Description'],
            ['specs', 'Specifications'],
            ['reviews', `Reviews (${reviews.length})`],
            ['qa', `Q&A (${product.qaCount || 0})`],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab ? 'border-amazon-orange text-amazon-orange' : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="py-6">
          {activeTab === 'description' && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-line max-w-3xl">{product.description}</p>
          )}

          {activeTab === 'specs' && (
            product.specifications && Object.keys(product.specifications).length > 0 ? (
              <table className="w-full max-w-lg text-sm">
                <tbody>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-700 w-40">{key}</td>
                      <td className="py-2 text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-gray-500">No specifications available.</p>
          )}

          {activeTab === 'reviews' && (
            <div>
              {/* Rating summary */}
              <div className="flex flex-col sm:flex-row gap-8 mb-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{product.rating.toFixed(1)}</div>
                  <StarRating rating={product.rating} size="lg" />
                  <p className="text-sm text-gray-500 mt-1">{product.reviewCount} ratings</p>
                </div>
                <div className="flex-1 space-y-2">
                  {ratingDistribution.map(({ stars, count, pct }) => (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-6 text-amazon-teal text-right">{stars}</span>
                      <FiStar className="text-amazon-orange text-xs" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-amazon-orange h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 w-8">{pct}%</span>
                      <span className="text-gray-400 text-xs">({count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {user && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-6 py-2 rounded-full text-sm mb-6">
                  Write a Review
                </button>
              )}

              {showReviewForm && (
                <form onSubmit={submitReview} className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-w-lg mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">Write a Customer Review</h3>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating</label>
                    <StarRating rating={reviewForm.rating} size="lg" interactive onChange={(r) => setReviewForm((p) => ({ ...p, rating: r }))} />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Title</label>
                    <input value={reviewForm.title} onChange={(e) => setReviewForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                      placeholder="Sum up your experience" required />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                    <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                      rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none"
                      placeholder="What did you like or dislike? What did you use this product for?" required />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={submittingReview} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm disabled:opacity-70">
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button type="button" onClick={() => setShowReviewForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
              ) : (
                <div>
                  {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'qa' && (
            <ProductQASection productId={id} />
          )}
        </div>
      </div>

      {/* Frequently Bought Together — Market Basket Analysis (Apriori) */}
      {product && (
        <div className="mt-10">
          <FrequentlyBoughtTogether
            anchorProduct={{
              _id: product._id,
              title: product.title,
              images: product.images,
              price: product.price,
              discountPrice: product.discountPrice,
              rating: product.rating,
              reviewCount: product.reviewCount,
            }}
          />
        </div>
      )}

      {/* Co-purchase recommendations */}
      <Recommendations productId={id} />

      {/* Recently viewed */}
      <RecentlyViewed excludeId={id} />

      {/* Chat with Seller modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">Chat with Seller</h3>
                <p className="text-xs text-gray-500">{sellerName} · {product.title.slice(0, 40)}{product.title.length > 40 ? '…' : ''}</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <FiX className="text-xl"/>
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {['Is this item available?', 'What are the payment options?', 'How fast is delivery?'].map(q => (
                <button key={q} onClick={() => setChatMsg(q)}
                  className={`w-full text-left text-xs border rounded-xl px-3 py-2 transition-colors ${
                    chatMsg === q ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}>
                  {q}
                </button>
              ))}
            </div>

            <textarea
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startChat() } }}
              placeholder="Write your message to the seller..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
            />

            <div className="flex gap-2">
              <button onClick={() => setChatOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={startChat} disabled={!chatMsg.trim() || chatSending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <FiSend className="text-sm"/> {chatSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
