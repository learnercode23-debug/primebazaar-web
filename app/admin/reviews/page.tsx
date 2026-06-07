'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StarRating from '@/components/ui/StarRating'
import { formatDate } from '@/lib/utils'
import { FiCheck, FiX, FiFlag } from 'react-icons/fi'

interface ReviewItem {
  _id: string
  rating: number
  title: string
  comment: string
  verified: boolean
  isApproved: boolean
  isFlagged: boolean
  createdAt: string
  user: { name: string; email: string }
  product: { title: string; images: string[] }
}

export default function AdminReviewsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    const q = filter === 'flagged' ? '?flagged=true' : ''
    axios.get(`/api/admin/reviews${q}`).then((r) => setReviews(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router, filter])

  async function action(reviewId: string, act: string) {
    await axios.put('/api/admin/reviews', { reviewId, action: act })
    if (act === 'remove') setReviews((p) => p.map((r) => r._id === reviewId ? { ...r, isApproved: false } : r))
    if (act === 'approve') setReviews((p) => p.map((r) => r._id === reviewId ? { ...r, isApproved: true } : r))
    if (act === 'unflag') setReviews((p) => p.map((r) => r._id === reviewId ? { ...r, isFlagged: false } : r))
    toast.success(`Review ${act}d`)
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Moderation</h1>

      <div className="flex gap-2 mb-6">
        {(['all', 'flagged'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-amazon-dark text-white' : 'border border-gray-300 text-gray-700'}`}>
            {f === 'flagged' ? '🚩 Flagged' : 'All Reviews'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className={`bg-white rounded-xl border-2 p-4 ${review.isFlagged ? 'border-red-200 bg-red-50/30' : !review.isApproved ? 'border-yellow-200' : 'border-gray-200'}`}>
            <div className="flex gap-4">
              {/* Product image */}
              <div className="relative w-14 h-14 bg-gray-50 rounded flex-shrink-0">
                <Image src={review.product?.images?.[0] || 'https://via.placeholder.com/60'} alt="" fill className="object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 line-clamp-1">{review.product?.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="font-semibold text-sm text-gray-900">{review.title}</span>
                      {review.verified && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓ Verified</span>}
                      {review.isFlagged && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><FiFlag /> Flagged</span>}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">By {review.user?.name} · {formatDate(review.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!review.isApproved && (
                      <button onClick={() => action(review._id, 'approve')}
                        className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-full font-medium">
                        <FiCheck /> Approve
                      </button>
                    )}
                    {review.isFlagged && (
                      <button onClick={() => action(review._id, 'unflag')}
                        className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-full font-medium">
                        Clear Flag
                      </button>
                    )}
                    {review.isApproved && (
                      <button onClick={() => action(review._id, 'remove')}
                        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-full font-medium">
                        <FiX /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-500">No reviews found</div>}
      </div>
    </div>
  )
}
