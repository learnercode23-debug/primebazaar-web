'use client'

import { useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import { Review } from '@/types'
import { formatDate } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import { FiThumbsUp, FiThumbsDown, FiCheckCircle, FiX } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface Props {
  review: Review
  productId: string
}

export default function ReviewCard({ review, productId }: Props) {
  const { user } = useAuth()
  const reviewUser = review.user as { name: string; avatar?: string }
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<number>(review.helpful || 0)
  const [voted, setVoted] = useState<'helpful' | 'unhelpful' | null>(null)
  const [voting, setVoting] = useState(false)

  const initials = reviewUser.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  async function vote(type: 'helpful' | 'unhelpful') {
    if (!user || voting) return
    if (voted === type) return
    setVoting(true)
    try {
      const res = await axios.post(`/api/reviews/${productId}/helpful`, {
        reviewId: review._id,
        vote: type,
      })
      setHelpful(res.data.data.helpful)
      setVoted(type)
    } catch {
      // silent
    } finally {
      setVoting(false)
    }
  }

  return (
    <>
      <div className="border-b border-gray-100 py-5 last:border-0">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">{reviewUser.name}</span>
              {review.verified && (
                <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  <FiCheckCircle className="text-[10px]" /> Verified Purchase
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Reviewed on {formatDate(review.createdAt)}</p>
          </div>
          <div className="text-2xl font-black text-amber-400 leading-none">{review.rating}.0</div>
        </div>

        <div className="ml-12">
          <div className="flex items-center gap-2 mb-1.5">
            <StarRating rating={review.rating} size="sm" />
            <span className="font-bold text-sm text-gray-900">{review.title}</span>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

          {/* Review photos */}
          {review.photos && review.photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {review.photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(url)}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-violet-400 transition-colors flex-shrink-0"
                >
                  <Image src={url} alt={`Review photo ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Helpful votes */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">Helpful?</span>
            <button
              onClick={() => vote('helpful')}
              disabled={voting || !user}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all press-effect',
                voted === 'helpful'
                  ? 'bg-violet-100 border-violet-300 text-violet-700 font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600'
              )}
            >
              <FiThumbsUp className="text-xs" /> Yes {helpful > 0 && `(${helpful})`}
            </button>
            <button
              onClick={() => vote('unhelpful')}
              disabled={voting || !user}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all press-effect',
                voted === 'unhelpful'
                  ? 'bg-red-50 border-red-200 text-red-600 font-bold'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
              )}
            >
              <FiThumbsDown className="text-xs" /> No
            </button>
            {!user && <span className="text-[10px] text-gray-400">(sign in to vote)</span>}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors">
            <FiX className="text-xl" />
          </button>
          <div className="relative max-w-lg max-h-[80vh] w-full h-full">
            <Image src={lightbox} alt="Review photo" fill className="object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
