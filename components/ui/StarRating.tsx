'use client'

import React from 'react'
import { FiStar } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
  showCount?: boolean
  count?: number
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  showCount = false,
  count = 0,
}: StarRatingProps) {
  const [hovered, setHovered] = React.useState(0)
  const sizeClass = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' }[size]

  const displayRating = interactive ? hovered || rating : rating

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxRating }).map((_, i) => {
          const filled = displayRating >= i + 1
          const halfFilled = !filled && displayRating >= i + 0.5

          return (
            <span
              key={i}
              className={cn(
                sizeClass,
                interactive ? 'cursor-pointer' : '',
                filled ? 'text-amber-500' : halfFilled ? 'text-amber-400/70' : 'text-gray-300'
              )}
              onMouseEnter={() => interactive && setHovered(i + 1)}
              onMouseLeave={() => interactive && setHovered(0)}
              onClick={() => interactive && onChange?.(i + 1)}
            >
              ★
            </span>
          )
        })}
      </div>
      {showCount && count > 0 && (
        <span className={cn('text-brand-600 hover:underline cursor-pointer', sizeClass)}>
          {count.toLocaleString()}
        </span>
      )}
    </div>
  )
}
