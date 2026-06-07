'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { FiStar } from 'react-icons/fi'

interface Review {
  _id: string
  rating: number
  title?: string
  body: string
  createdAt: string
  user: { name: string; avatar?: string }
  product: { title: string; images: string[] }
}

interface Stats {
  total: number
  avgRating: number
  ratingCounts: { rating: number; count: number }[]
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar key={s} className={`text-sm ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

export default function SellerReviewsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState<number | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'seller' && user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, authLoading, router])

  async function load(rating?: number | null) {
    setLoading(true)
    try {
      const url = rating ? `/api/seller/reviews?rating=${rating}` : '/api/seller/reviews'
      const res = await axios.get(url)
      setReviews(res.data.data || [])
      if (res.data.stats) setStats(res.data.stats)
    } finally {
      setLoading(false)
    }
  }

  function setFilter(r: number | null) {
    setFilterRating(r)
    load(r)
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <Breadcrumb items={[
        { label: 'Seller Dashboard', href: '/seller' },
        { label: 'Customer Reviews' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
        {stats && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <FiStar className="text-amber-500 fill-amber-500 text-lg" />
            <span className="text-2xl font-black text-gray-900">{stats.avgRating}</span>
            <span className="text-sm text-gray-500">/ 5 · {stats.total} reviews</span>
          </div>
        )}
      </div>

      {/* Rating breakdown + filter */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-5 gap-2">
            {stats.ratingCounts.map(({ rating, count }) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              const active = filterRating === rating
              return (
                <button key={rating}
                  onClick={() => setFilter(active ? null : rating)}
                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all text-sm ${active ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200'}`}
                >
                  <div className="flex items-center gap-0.5 mb-1">
                    <span className="font-bold">{rating}</span>
                    <FiStar className="text-amber-400 fill-amber-400 text-xs" />
                  </div>
                  <div className="w-full bg-gray-100 rounded h-1.5 mb-1">
                    <div className="bg-amber-400 h-1.5 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-500 text-xs">{count}</span>
                </button>
              )
            })}
          </div>
          {filterRating && (
            <button onClick={() => setFilter(null)} className="mt-3 text-xs text-amazon-teal hover:underline">
              ✕ Clear filter — show all {stats.total} reviews
            </button>
          )}
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <FiStar className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">
            {filterRating ? `No ${filterRating}-star reviews` : 'No reviews yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Customer reviews will appear here once orders are delivered.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex gap-4">
                {/* Product thumbnail */}
                {review.product?.images?.[0] && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={review.product.images[0]} alt={review.product.title} fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5 truncate">{review.product?.title}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <Stars rating={review.rating} />
                    {review.title && <span className="text-sm font-semibold text-gray-900">{review.title}</span>}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{review.user?.name}</span>
                    <span>·</span>
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
