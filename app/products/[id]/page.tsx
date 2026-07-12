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
import SizeGuide from '@/components/product/SizeGuide'
import ProductQASection from '@/components/product/ProductQASection'
import Recommendations from '@/components/product/Recommendations'
import RecentlyViewed from '@/components/product/RecentlyViewed'
import FrequentlyBoughtTogether from '@/components/product/FrequentlyBoughtTogether'
import YouMightAlsoLike from '@/components/product/YouMightAlsoLike'
import { ProductDetailSkeleton } from '@/components/ui/Skeleton'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  FiShoppingCart, FiHeart, FiShare2, FiTruck, FiShield,
  FiRefreshCw, FiStar, FiMinus, FiPlus, FiCheck, FiZap,
  FiMessageCircle, FiX, FiSend,
} from 'react-icons/fi'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import ClipCoupon from '@/components/product/ClipCoupon'
import PriceHistoryChart from '@/components/product/PriceHistoryChart'
import LookInsideModal from '@/components/product/LookInsideModal'
import ShareSheet from '@/components/ui/ShareSheet'

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
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
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
  const [subscribeMode, setSubscribeMode]       = useState<'once' | 'subscribe'>('once')
  const [subscribeFreq, setSubscribeFreq]       = useState('monthly')
  const [priceAlertEmail, setPriceAlertEmail]   = useState('')
  const [priceAlertTarget, setPriceAlertTarget] = useState('')
  const [priceAlertDone, setPriceAlertDone]     = useState(false)
  const [priceAlertLoading, setPriceAlertLoading] = useState(false)
  const [reviewSort, setReviewSort]             = useState<'recent' | 'helpful' | 'highest' | 'lowest'>('recent')
  const [sellerRating, setSellerRating]         = useState<{ avgRating: number; totalOrders: number } | null>(null)

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

  async function submitPriceAlert(e: React.FormEvent) {
    e.preventDefault()
    setPriceAlertLoading(true)
    try {
      await axios.post(`/api/products/${id}/price-alert`, { email: priceAlertEmail, targetPrice: Number(priceAlertTarget) })
      setPriceAlertDone(true)
      toast.success("We'll notify you when the price drops!")
    } catch {
      toast.error('Failed. Please try again.')
    } finally {
      setPriceAlertLoading(false)
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
      const sid = typeof prod.seller === 'string' ? prod.seller : (prod.seller as { _id?: string })?._id
      if (sid) {
        axios.get(`/api/seller/performance/${sid}`).then(res => setSellerRating(res.data.data)).catch(() => {})
      }
    }).catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false))
    trackView()
  }, [id, trackView])

  // Clamp quantity to the active variant's stock whenever the selection changes,
  // so switching from a high-stock variant to a low-stock one can't leave qty too high.
  useEffect(() => {
    const stock = selectedVariant ? selectedVariant.stock : product?.stock
    if (stock == null) return
    setQuantity((q) => Math.min(Math.max(1, q), stock || 1))
  }, [selectedVariant, product])

  async function handleAddToCart() {
    if (!product) return
    if (product.hasVariants && product.variants?.length && !selectedVariant) {
      toast.error('Please select an option')
      return
    }
    await addToCart(product._id, quantity)
  }

  const [oneClickOpen, setOneClickOpen] = useState(false)
  const [oneClickPlacing, setOneClickPlacing] = useState(false)

  async function handleBuyNow() {
    if (!user) { router.push('/login'); return }
    if (product?.hasVariants && product.variants?.length && !selectedVariant) {
      toast.error('Please select an option')
      return
    }
    setOneClickOpen(true)
  }

  async function placeOneClickOrder() {
    setOneClickPlacing(true)
    try {
      await addToCart(product!._id, quantity)
      router.push('/checkout')
    } catch {
      setOneClickPlacing(false)
      toast.error('Could not start checkout. Please try again.')
    }
  }

  async function handleReviewPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    const reader = new FileReader()
    // The upload happens inside the async onload callback, so its errors must be
    // caught here — the outer sync try/catch never sees them. Always clear the
    // uploading flag so a failed upload can't leave the tile spinning / Submit disabled.
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string
        const res = await axios.post('/api/upload', { image: base64, folder: 'primebazaar/reviews' })
        setReviewPhotos((p) => [...p, res.data.data.url])
      } catch {
        toast.error('Photo upload failed')
      } finally {
        setUploadingPhoto(false)
      }
    }
    reader.onerror = () => {
      toast.error('Could not read the image')
      setUploadingPhoto(false)
    }
    reader.readAsDataURL(file)
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { toast.error('Please login to leave a review'); return }
    setSubmittingReview(true)
    try {
      const res = await axios.post('/api/reviews', { productId: id, ...reviewForm, photos: reviewPhotos })
      setReviews((p) => [res.data.data, ...p])
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', comment: '' })
      setReviewPhotos([])
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

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: images,
    sku: product._id,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `https://www.primepasal.com/products/${id}`,
      priceCurrency: 'NPR',
      price: price,
      availability: (product.stock ?? 0) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Primepasal' },
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: reviews.length || 1,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: category?.name || 'Products', href: `/products?category=${encodeURIComponent(category?.name || '')}` },
        { label: product.title },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Images */}
        <div className="lg:col-span-4">
          <ImageGallery images={images} title={product.title} />
          {category?.name?.toLowerCase().includes('book') && (
            <LookInsideModal images={images} title={product.title} />
          )}
        </div>

        {/* Product info */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link href={`/products?brand=${encodeURIComponent(product.brand)}`} className="text-sm text-amazon-teal hover:underline font-medium">
              {product.brand}
            </Link>
            <Link href={`/brand/${encodeURIComponent(product.brand)}`} className="text-xs text-violet-500 hover:underline">
              Visit brand store →
            </Link>
            {product.isFeatured && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">Featured</span>}
            {product.isApproved && (
              <span className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                <FiShield className="text-[10px]" /> Genuine Product
              </span>
            )}
            {product.freeShipping && (
              <span className="flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                <FiTruck className="text-[10px]" /> Fulfilled by Primepasal
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2 leading-snug">{product.title}</h1>


          <div className="flex items-center gap-3 mb-3">
            <StarRating rating={product.rating} size="md" />
            <a href="#reviews" onClick={() => setActiveTab('reviews')} className="text-amazon-teal text-sm hover:underline">
              {product.reviewCount.toLocaleString()} ratings
            </a>
            {product.salesCount && product.salesCount > 100 && (
              <span className="text-xs text-gray-500">{product.salesCount.toLocaleString()}+ sold</span>
            )}
          </div>

          {/* Earn points label */}
          <Link href="/rewards" className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-semibold hover:bg-amber-100 transition-colors mb-2">
            ⭐ Earn {Math.ceil(price / 20)} PP Points on this purchase
          </Link>

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

          {/* Clip coupon */}
          {hasDiscount && (
            <ClipCoupon price={price} productId={id} />
          )}

          {/* Price history sparkline */}
          <PriceHistoryChart currentPrice={price} originalPrice={originalPrice} />

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

          {/* Variants + size guide */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Option</span>
                <SizeGuide category={typeof product.category === 'string' ? product.category : (product.category as { name?: string })?.name} />
              </div>
              <ProductVariants
                variants={product.variants}
                selected={selectedVariant}
                onSelect={setSelectedVariant}
              />
            </div>
          )}

          {/* Size guide standalone (no variants) */}
          {(!product.hasVariants || !product.variants?.length) && (
            <div className="mb-3 flex justify-end">
              <SizeGuide category={typeof product.category === 'string' ? product.category : (product.category as { name?: string })?.name} />
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

          {/* Subscribe & Save */}
          {stock > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Purchase Option</p>
              <label className={`flex items-start gap-3 cursor-pointer p-2 rounded-xl transition-colors ${subscribeMode === 'once' ? 'bg-white border border-amber-300 shadow-sm' : 'hover:bg-amber-100/50'}`}>
                <input type="radio" checked={subscribeMode === 'once'} onChange={() => setSubscribeMode('once')} className="mt-0.5 accent-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">One-time purchase</p>
                  <p className="text-xs text-gray-500">{formatPrice(price)}</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 cursor-pointer p-2 rounded-xl transition-colors ${subscribeMode === 'subscribe' ? 'bg-white border border-amber-300 shadow-sm' : 'hover:bg-amber-100/50'}`}>
                <input type="radio" checked={subscribeMode === 'subscribe'} onChange={() => setSubscribeMode('subscribe')} className="mt-0.5 accent-violet-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">Subscribe & Save</p>
                    <span className="text-[10px] bg-green-600 text-white font-bold px-1.5 py-0.5 rounded-full">5% OFF</span>
                  </div>
                  <p className="text-xs text-green-700 font-semibold">{formatPrice(Math.round(price * 0.95))} / delivery</p>
                  {subscribeMode === 'subscribe' && (
                    <select
                      value={subscribeFreq}
                      onChange={(e) => setSubscribeFreq(e.target.value)}
                      className="mt-1.5 text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                    >
                      <option value="weekly">Every week</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Every month</option>
                      <option value="bimonthly">Every 2 months</option>
                    </select>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Price drop alert */}
          {stock > 0 && (
            <div className="mb-4">
              {!priceAlertDone ? (
                <details className="group">
                  <summary className="text-xs text-violet-600 hover:text-violet-800 font-semibold cursor-pointer flex items-center gap-1 list-none">
                    🔔 Get a price drop alert
                  </summary>
                  <form onSubmit={submitPriceAlert} className="mt-2 flex flex-col gap-2">
                    <input
                      type="email"
                      value={priceAlertEmail}
                      onChange={(e) => setPriceAlertEmail(e.target.value)}
                      placeholder="Your email"
                      required
                      className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={priceAlertTarget}
                        onChange={(e) => setPriceAlertTarget(e.target.value)}
                        placeholder={`Target price (current: ${formatPrice(price)})`}
                        required
                        min={1}
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <button type="submit" disabled={priceAlertLoading} className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
                        {priceAlertLoading ? '…' : 'Alert me'}
                      </button>
                    </div>
                  </form>
                </details>
              ) : (
                <p className="text-xs text-green-600 flex items-center gap-1"><FiCheck /> Price alert set!</p>
              )}
            </div>
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
              className="w-full bg-amazon-orange hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <FiZap className="text-sm" /> Buy Now — 1-Click
            </button>

            {/* ── One-click buy modal ── */}
            {oneClickOpen && product && (
              <>
                <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !oneClickPlacing && setOneClickOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-auto">
                  {(
                    <>
                      <h2 className="font-black text-gray-900 text-base mb-1">Express Checkout</h2>
                      <p className="text-xs text-gray-500 mb-4">We&apos;ll add this item and take you straight to checkout to confirm address &amp; payment.</p>

                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
                        {product.images[0] && (
                          <img src={product.images[0]} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm line-clamp-2">{product.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {quantity}</p>
                        </div>
                        <p className="font-black text-gray-900 flex-shrink-0">{formatPrice(price * quantity)}</p>
                      </div>

                      <div className="space-y-2 mb-4 text-xs text-gray-600">
                        <div className="flex justify-between py-1.5 border-b border-gray-100">
                          <span>Item subtotal</span>
                          <span className="font-semibold text-gray-900">{formatPrice(price * quantity)}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-gray-400">Address, payment &amp; shipping</span>
                          <span className="font-semibold text-gray-500">Chosen at checkout</span>
                        </div>
                      </div>

                      <button
                        onClick={placeOneClickOrder}
                        disabled={oneClickPlacing}
                        className="w-full bg-amazon-orange hover:bg-orange-500 disabled:opacity-70 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {oneClickPlacing ? (
                          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                        ) : (
                          <><FiZap /> Continue to Checkout</>
                        )}
                      </button>
                      <button onClick={() => setOneClickOpen(false)} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1.5">
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
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
            {sellerRating && sellerRating.avgRating > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                <span className="text-amber-400">★</span>
                <span className="font-bold text-gray-700">{sellerRating.avgRating.toFixed(1)}</span>
                <span>seller · {sellerRating.totalOrders.toLocaleString()} orders</span>
              </span>
            )}
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 transition-colors"
            >
              <FiShare2 /> Share
            </button>
          </div>

          {/* Share sheet */}
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            url={typeof window !== 'undefined' ? `${window.location.origin}/products/${id}` : `https://www.primepasal.com/products/${id}`}
            title={product?.title || ''}
          />
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
            <hr />

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-start gap-2"><FiShield className="flex-shrink-0 mt-0.5" /> Secure transaction</div>
              <div className="flex items-start gap-2"><FiRefreshCw className="flex-shrink-0 mt-0.5" /> 7-day return policy</div>
              <div className="flex items-start gap-2"><FiTruck className="flex-shrink-0 mt-0.5" /> Ships from PrimePasal warehouse</div>
            </div>

            {/* Other sellers */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2">Other sellers on PrimePasal</p>
              <div className="space-y-1.5">
                {[
                  { name: 'TechZone Store', price: Math.round(price * 1.03), rating: 4.6, condition: 'New' },
                  { name: 'ShopNepal',      price: Math.round(price * 1.06), rating: 4.3, condition: 'New' },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs border border-gray-100 rounded-lg px-2.5 py-2 hover:border-violet-200 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-800">{s.name}</p>
                      <p className="text-gray-400">⭐ {s.rating} · {s.condition}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900">{formatPrice(s.price)}</p>
                      <button className="text-violet-600 hover:underline">Buy</button>
                    </div>
                  </div>
                ))}
              </div>
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
            <div className="max-w-3xl space-y-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              {product.videoUrl && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Product Video</h3>
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-xl shadow-lg">
                    <video
                      src={product.videoUrl}
                      controls
                      className="w-full h-full"
                      poster={product.images?.[0]}
                    />
                  </div>
                </div>
              )}
            </div>
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
                  {/* Photo upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Photos <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex gap-2 flex-wrap items-center">
                      {reviewPhotos.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setReviewPhotos(p => p.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <FiX />
                          </button>
                        </div>
                      ))}
                      {reviewPhotos.length < 4 && (
                        <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-violet-400 flex items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-violet-500">
                          {uploadingPhoto ? <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : <span className="text-2xl leading-none">+</span>}
                          <input type="file" accept="image/*" className="hidden" onChange={handleReviewPhotoUpload} disabled={uploadingPhoto} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" disabled={submittingReview || uploadingPhoto} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm disabled:opacity-70">
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button type="button" onClick={() => { setShowReviewForm(false); setReviewPhotos([]) }} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
              ) : (
                <div>
                  {/* Sort bar */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs text-gray-500 font-semibold">Sort by:</span>
                    {(['recent', 'helpful', 'highest', 'lowest'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setReviewSort(s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${reviewSort === s ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:border-violet-300'}`}
                      >
                        {s === 'recent' ? 'Most Recent' : s === 'helpful' ? 'Most Helpful' : s === 'highest' ? '★ High to Low' : '★ Low to High'}
                      </button>
                    ))}
                  </div>
                  {[...reviews]
                    .sort((a, b) => {
                      if (reviewSort === 'helpful') return (b.helpful || 0) - (a.helpful || 0)
                      if (reviewSort === 'highest') return b.rating - a.rating
                      if (reviewSort === 'lowest') return a.rating - b.rating
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    })
                    .map((r) => <ReviewCard key={r._id} review={r} productId={id} />)}
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

      {/* You might also like — ML scored */}
      {product && (
        <YouMightAlsoLike
          anchorId={id}
          anchorPrice={product.discountPrice || product.price}
          category={(product as unknown as { category?: { name?: string } | string }).category
            ? (typeof (product as unknown as { category: { name?: string } | string }).category === 'object'
                ? ((product as unknown as { category: { name?: string } }).category.name)
                : String((product as unknown as { category: string }).category))
            : undefined}
        />
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
                <p className="text-xs text-gray-500">{product.title.slice(0, 40)}{product.title.length > 40 ? '…' : ''}</p>
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
