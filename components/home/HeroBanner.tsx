'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { FiChevronLeft, FiChevronRight, FiZap, FiTag, FiTrendingUp } from 'react-icons/fi'
import type { IconType } from 'react-icons'

interface Slide {
  id: number | string; title: string; subtitle: string; cta: string; href: string
  bg: string; tag?: string; tagColor: string; tagIcon: IconType; badge?: string
  image: string
}

// Decorative styling reused for admin-managed banners (which don't carry these fields).
const PALETTE = [
  { bg: 'from-[#1E1B4B] via-[#312E81] to-[#4C1D95]', tagColor: 'bg-amber-500 text-gray-900', tagIcon: FiZap },
  { bg: 'from-[#1E1B4B] via-[#4A1D96] to-[#6D28D9]', tagColor: 'bg-pink-500 text-white', tagIcon: FiTag },
  { bg: 'from-[#1E1B4B] via-[#2D2464] to-[#1E1B4B]', tagColor: 'bg-red-500 text-white', tagIcon: FiTrendingUp },
]

const SLIDES: Slide[] = [
  {
    id: 1,
    title: 'Biggest Tech Sale',
    subtitle: 'Up to 40% off on laptops, phones & more. Delivered across Nepal.',
    cta: 'Shop Electronics',
    href: '/products?category=Electronics',
    bg: 'from-[#1E1B4B] via-[#312E81] to-[#4C1D95]',
    tag: 'Up to 40% Off',
    tagColor: 'bg-amber-500 text-gray-900',
    tagIcon: FiZap,
    badge: '−40%',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=85&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Fashion That Defines You',
    subtitle: 'New arrivals in clothing, shoes & accessories for every style.',
    cta: 'Explore Fashion',
    href: '/products?category=Fashion',
    bg: 'from-[#1E1B4B] via-[#4A1D96] to-[#6D28D9]',
    tag: 'New Arrivals',
    tagColor: 'bg-pink-500 text-white',
    tagIcon: FiTag,
    badge: 'NEW',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&auto=format&fit=crop',
  },
  {
    id: 3,
    title: "Today's Best Deals",
    subtitle: "Limited time offers — grab them before they're gone!",
    cta: 'See All Deals',
    href: '/products?dealOfDay=true',
    bg: 'from-[#1E1B4B] via-[#2D2464] to-[#1E1B4B]',
    tag: 'Deal of the Day',
    tagColor: 'bg-red-500 text-white',
    tagIcon: FiTrendingUp,
    badge: 'DEAL',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=85&auto=format&fit=crop',
  },
]

interface DbBanner {
  _id: string; title: string; subtitle?: string; image: string; link?: string; buttonText?: string
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [slides, setSlides] = useState<Slide[]>(SLIDES)

  // Use admin-managed banners when present; otherwise keep the default slides.
  useEffect(() => {
    axios.get('/api/banners?position=hero')
      .then((r) => {
        const data: DbBanner[] = r.data?.data || []
        if (data.length > 0) {
          setSlides(data.map((b, i) => ({
            id: b._id,
            title: b.title,
            subtitle: b.subtitle || '',
            cta: b.buttonText || 'Shop Now',
            href: b.link || '/products',
            image: b.image,
            ...PALETTE[i % PALETTE.length],
          })))
          setCurrent(0)
        }
      })
      .catch(() => { /* keep fallback slides */ })
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const slide = slides[current] ?? slides[0]
  const TagIcon = slide.tagIcon

  return (
    <div className={`relative bg-gradient-to-r ${slide.bg} overflow-hidden`} style={{ minHeight: 180 }}>
      <div className="absolute inset-0 opacity-15">
        <Image src={slide.image} alt="" fill className="object-cover" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-14 flex items-center justify-between gap-4">
        <div key={current} className="text-white flex-1 min-w-0">
          {slide.tag && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-3 ${slide.tagColor} animate-slide-in-left`}
              style={{ animationDelay: '0ms' }}
            >
              <TagIcon className="text-sm" />
              {slide.tag}
            </span>
          )}
          <h1
            className="text-xl sm:text-3xl lg:text-4xl font-bold mb-2 leading-tight animate-slide-in-left"
            style={{ animationDelay: '80ms' }}
          >
            {slide.title}
          </h1>
          <p
            className="text-sm sm:text-base text-white/70 mb-4 line-clamp-2 animate-slide-in-left"
            style={{ animationDelay: '160ms' }}
          >
            {slide.subtitle}
          </p>
          <div
            className="flex gap-3 flex-wrap animate-slide-in-left"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href={slide.href}
              className="inline-flex items-center bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm sm:text-base transition-all shadow-lg shadow-amber-500/30 animate-glow-amber"
            >
              {slide.cta} →
            </Link>
            <Link href="/products" className="hidden sm:inline-flex items-center gap-1 border border-white/30 hover:border-white/60 text-white px-4 py-2.5 rounded-full text-sm">
              <FiZap className="text-amber-400" /> All Deals
            </Link>
          </div>
        </div>

        <div key={`img-${current}`} className="hidden sm:block relative flex-shrink-0">
          <div
            className="relative w-40 h-28 sm:w-56 sm:h-40 md:w-72 md:h-52 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-slide-in-right"
            style={{ animationDelay: '120ms' }}
          >
            <Image src={slide.image} alt={slide.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          {slide.badge && (
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-gray-900 font-black text-xs px-3 py-1.5 rounded-full shadow-lg animate-float">
              {slide.badge}
            </div>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)} aria-label="Previous slide" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-1.5 sm:p-2.5 border border-white/10">
            <FiChevronLeft className="text-base sm:text-xl" />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % slides.length)} aria-label="Next slide" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-1.5 sm:p-2.5 border border-white/10">
            <FiChevronRight className="text-base sm:text-xl" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}: ${s.title}`} className={`rounded-full transition-all ${i === current ? 'w-5 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
