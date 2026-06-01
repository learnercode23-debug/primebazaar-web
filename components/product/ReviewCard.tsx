import { Review } from '@/types'
import { formatDate } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import { FiThumbsUp, FiCheckCircle } from 'react-icons/fi'

export default function ReviewCard({ review }: { review: Review }) {
  const user = review.user as { name: string; avatar?: string }
  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amazon-blue text-white flex items-center justify-center text-sm font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-sm text-gray-900">{user.name}</span>
            {review.verified && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <FiCheckCircle /> Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} size="sm" />
            <span className="font-semibold text-sm text-gray-900">{review.title}</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">Reviewed on {formatDate(review.createdAt)}</p>
          <p className="text-sm text-gray-700">{review.comment}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">
              <FiThumbsUp /> Helpful ({review.helpful})
            </button>
          </div>
        </div>
        <div className="text-2xl font-bold text-amazon-yellow">{review.rating}.0</div>
      </div>
    </div>
  )
}
