'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCompare } from '@/contexts/CompareContext'
import { FiX, FiBarChart2 } from 'react-icons/fi'

export default function CompareBar() {
  const { items, removeFromCompare, clearCompare } = useCompare()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-violet-600 shadow-2xl shadow-violet-200/50 animate-slide-in-up">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {items.map(item => (
            <div key={item._id} className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white flex-shrink-0">
                <Image src={item.images?.[0] || 'https://via.placeholder.com/60'} alt={item.title} fill className="object-contain p-0.5" />
              </div>
              <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate">{item.title}</span>
              <button onClick={() => removeFromCompare(item._id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <FiX className="text-xs" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - items.length) }).map((_, i) => (
            <div key={i} className="w-32 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
              + Add product
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={clearCompare} className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1">
            Clear
          </button>
          <Link
            href={`/compare?ids=${items.map(i => i._id).join(',')}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${items.length < 2 ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none' : 'btn-gradient'}`}
          >
            <FiBarChart2 /> Compare {items.length < 2 ? `(need ${2 - items.length} more)` : `${items.length} items`}
          </Link>
        </div>
      </div>
    </div>
  )
}
