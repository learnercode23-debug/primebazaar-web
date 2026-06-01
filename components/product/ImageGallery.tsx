'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FiChevronLeft, FiChevronRight, FiZoomIn } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  images: string[]
  title: string
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  const imgs = images.length > 0 ? images : ['https://via.placeholder.com/600']

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!zoomed) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  return (
    <div>
      {/* Main image */}
      <div
        className="relative h-80 sm:h-96 bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 cursor-zoom-in"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <div
          className={cn('w-full h-full transition-transform duration-100', zoomed ? 'scale-150' : 'scale-100')}
          style={zoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
        >
          <Image
            src={imgs[selected]}
            alt={`${title} — image ${selected + 1}`}
            fill
            className="object-contain p-6"
            sizes="(max-width: 768px) 100vw, 500px"
            priority={selected === 0}
          />
        </div>

        {!zoomed && <div className="absolute top-3 right-3 bg-white/80 rounded-full p-1.5 text-gray-500"><FiZoomIn /></div>}

        {imgs.length > 1 && (
          <>
            <button
              onClick={() => setSelected((p) => (p - 1 + imgs.length) % imgs.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-all"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={() => setSelected((p) => (p + 1) % imgs.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-all"
            >
              <FiChevronRight />
            </button>
          </>
        )}

        {/* Slide counter */}
        {imgs.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {selected + 1}/{imgs.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {imgs.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden bg-white transition-all',
                i === selected ? 'border-amazon-orange ring-1 ring-amazon-orange' : 'border-gray-200 hover:border-gray-400'
              )}
            >
              <div className="relative w-full h-full">
                <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-contain p-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
