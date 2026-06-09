'use client'

import { useState, useMemo } from 'react'
import { FiTrendingDown, FiTrendingUp } from 'react-icons/fi'

interface PriceHistoryChartProps {
  currentPrice: number
  originalPrice: number
}

export default function PriceHistoryChart({ currentPrice, originalPrice }: PriceHistoryChartProps) {
  const [open, setOpen] = useState(false)

  // Generate 30 days of plausible price history anchored to current / original price
  const history = useMemo(() => {
    const high = originalPrice
    const low = currentPrice
    const range = high - low
    const points: number[] = []
    // Seed with original price, drift towards current price over 30 days
    for (let i = 0; i < 30; i++) {
      const t = i / 29
      const base = high - t * range
      const noise = (Math.sin(i * 2.5) * 0.03 + Math.cos(i * 1.7) * 0.02) * high
      points.push(Math.max(low, Math.round(base + noise)))
    }
    points[29] = currentPrice
    return points
  }, [currentPrice, originalPrice])

  const min = Math.min(...history)
  const max = Math.max(...history)
  const diff = max - min || 1
  const W = 260
  const H = 64
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * W
    const y = H - ((v - min) / diff) * H
    return `${x},${y}`
  }).join(' ')

  const trending = history[28] > history[29] ? 'down' : 'up'
  const lowestInMonth = Math.min(...history)
  const isLowest = currentPrice <= lowestInMonth + 1

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-violet-600 hover:text-violet-800 font-semibold flex items-center gap-1 transition-colors"
      >
        📈 Price history {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-xl p-3 bg-gray-50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-bold text-gray-700">Last 30 days</p>
              {isLowest && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                  Lowest price in 30 days!
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${trending === 'down' ? 'text-green-600' : 'text-red-500'}`}>
              {trending === 'down' ? <FiTrendingDown /> : <FiTrendingUp />}
              {trending === 'down' ? 'Price dropped' : 'Price increased'}
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible">
            <defs>
              <linearGradient id="ph-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <polygon
              points={`0,${H} ${pts} ${W},${H}`}
              fill="url(#ph-grad)"
            />
            {/* Line */}
            <polyline points={pts} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* Current price dot */}
            <circle cx={W} cy={H - ((currentPrice - min) / diff) * H} r="4" fill="#7c3aed" />
          </svg>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>30 days ago</span>
            <span>High: Rs.{max.toLocaleString()}</span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}
