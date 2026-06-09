'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiRotateCw } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  images: string[]
  title: string
}

const ZOOM_SCALE = 2.5

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<'normal' | 'zoom' | '360'>('normal')
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [zoomVisible, setZoomVisible] = useState(false)

  // 360° drag state
  const [frame360, setFrame360] = useState(0)
  const drag360 = useRef<{ active: boolean; startX: number; startFrame: number }>({ active: false, startX: 0, startFrame: 0 })

  const imgs = images.length > 0 ? images : ['https://via.placeholder.com/600']
  const totalFrames = imgs.length

  /* ── Zoom handlers ─────────────────────────────────────────────── */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'zoom') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setZoomPos({ x, y })
  }, [mode])

  /* ── 360° handlers ─────────────────────────────────────────────── */
  function start360(clientX: number) {
    drag360.current = { active: true, startX: clientX, startFrame: frame360 }
  }
  function move360(clientX: number) {
    if (!drag360.current.active) return
    const delta = clientX - drag360.current.startX
    const frameDelta = Math.round(delta / 8)
    const newFrame = ((drag360.current.startFrame + frameDelta) % totalFrames + totalFrames) % totalFrames
    setFrame360(newFrame)
  }
  function end360() { drag360.current.active = false }

  const currentImg = mode === '360' ? imgs[frame360] : imgs[selected]

  return (
    <div className="w-full">
      {/* ── Main image area ─────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Image container */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'relative h-80 sm:h-96 bg-white rounded-2xl border border-gray-200 overflow-hidden mb-3',
              mode === 'zoom' ? 'cursor-crosshair' : mode === '360' ? 'cursor-grab active:cursor-grabbing select-none' : 'cursor-zoom-in'
            )}
            onMouseEnter={() => { if (mode === 'zoom') setZoomVisible(true) }}
            onMouseLeave={() => setZoomVisible(false)}
            onMouseMove={handleMouseMove}
            onClick={() => { if (mode === 'normal') setMode('zoom') }}
            /* 360° mouse */
            onMouseDown={mode === '360' ? (e) => start360(e.clientX) : undefined}
            onMouseMoveCapture={mode === '360' ? (e) => move360(e.clientX) : undefined}
            onMouseUp={mode === '360' ? end360 : undefined}
            /* 360° touch */
            onTouchStart={mode === '360' ? (e) => start360(e.touches[0].clientX) : undefined}
            onTouchMove={mode === '360' ? (e) => { e.preventDefault(); move360(e.touches[0].clientX) } : undefined}
            onTouchEnd={mode === '360' ? end360 : undefined}
          >
            <div
              className="w-full h-full transition-none"
              style={mode === 'zoom' && zoomVisible ? {
                transform: `scale(${ZOOM_SCALE})`,
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transition: 'none',
              } : { transform: 'scale(1)', transition: 'transform 0.2s ease' }}
            >
              <Image
                src={currentImg}
                alt={`${title} — image ${selected + 1}`}
                fill
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 500px"
                priority={selected === 0}
                draggable={false}
              />
            </div>

            {/* Mode badge */}
            {mode === '360' && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
                <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <FiRotateCw className="animate-spin-slow" /> Drag to rotate · {frame360 + 1}/{totalFrames}
                </div>
              </div>
            )}

            {/* Zoom badge (normal mode) */}
            {mode === 'normal' && (
              <div className="absolute top-3 right-3 bg-white/85 backdrop-blur-sm text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm pointer-events-none">
                <FiZoomIn className="text-violet-500" /> Click to zoom
              </div>
            )}

            {/* Exit zoom badge */}
            {mode === 'zoom' && (
              <button
                onClick={(e) => { e.stopPropagation(); setMode('normal'); setZoomVisible(false) }}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm hover:bg-white transition-colors z-10"
              >
                ✕ Exit zoom
              </button>
            )}

            {/* Navigation arrows — not in 360 mode */}
            {mode !== '360' && imgs.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected((p) => (p - 1 + imgs.length) % imgs.length) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white rounded-full p-2 shadow transition-all z-10"
                >
                  <FiChevronLeft />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected((p) => (p + 1) % imgs.length) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white rounded-full p-2 shadow transition-all z-10"
                >
                  <FiChevronRight />
                </button>
              </>
            )}

            {/* Counter */}
            {mode !== '360' && imgs.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                {selected + 1}/{imgs.length}
              </div>
            )}
          </div>

          {/* Mode toggle buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode('normal')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all press-effect',
                mode === 'normal' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
              )}
            >
              <FiZoomIn /> Zoom
            </button>
            {imgs.length > 1 && (
              <button
                onClick={() => { setMode(mode === '360' ? 'normal' : '360'); setFrame360(selected) }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all press-effect',
                  mode === '360' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                )}
              >
                <FiRotateCw /> 360°
              </button>
            )}
          </div>

          {/* Thumbnails */}
          {imgs.length > 1 && mode !== '360' && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-all press-effect',
                    i === selected
                      ? 'border-violet-500 ring-2 ring-violet-200 shadow-md'
                      : 'border-gray-200 hover:border-violet-300'
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
      </div>
    </div>
  )
}
