'use client'

import { useState } from 'react'
import { FiTag, FiCheck } from 'react-icons/fi'

interface ClipCouponProps {
  price: number
  productId: string
}

export default function ClipCoupon({ price, productId }: ClipCouponProps) {
  const savings = Math.round(price * 0.05)
  const [clipped, setClipped] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(`clipped-${productId}`) === '1'
  })

  function clip() {
    localStorage.setItem(`clipped-${productId}`, '1')
    // Store code so cart can offer to apply it
    const existing = JSON.parse(localStorage.getItem('pp-clipped-coupons') || '[]')
    if (!existing.includes('CLIP5')) existing.push('CLIP5')
    localStorage.setItem('pp-clipped-coupons', JSON.stringify(existing))
    setClipped(true)
  }

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`flex items-center gap-2 border-2 border-dashed rounded-lg px-3 py-1.5 transition-colors ${clipped ? 'border-green-400 bg-green-50' : 'border-amber-400 bg-amber-50 cursor-pointer hover:bg-amber-100'}`}
        onClick={!clipped ? clip : undefined}
      >
        <FiTag className={clipped ? 'text-green-600' : 'text-amber-600'} />
        {clipped ? (
          <span className="text-xs font-bold text-green-700 flex items-center gap-1">
            <FiCheck className="text-xs" /> Coupon clipped — 5% off applied at cart
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-800">
            Clip Rs.{savings} coupon &nbsp;<span className="underline">Click to clip</span>
          </span>
        )}
      </div>
    </div>
  )
}
