'use client'

import { useState } from 'react'
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import Image from 'next/image'

interface LookInsideModalProps {
  images: string[]
  title: string
}

const PREVIEW_PAGES = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
  'https://images.unsplash.com/photo-1568667256549-094345857949?w=400&q=80',
]

export default function LookInsideModal({ images, title }: LookInsideModalProps) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const previews = [...(images.slice(0, 1)), ...PREVIEW_PAGES].slice(0, 4)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full flex items-center justify-center gap-2 border border-amazon-teal text-amazon-teal hover:bg-teal-50 rounded-lg py-2 text-xs font-bold transition-colors"
      >
        🔍 Look inside
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-bold text-sm text-gray-900 line-clamp-1">Look inside: {title}</p>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-900">
                <FiX />
              </button>
            </div>
            <div className="relative bg-gray-100 flex items-center justify-center h-72">
              <Image src={previews[page]} alt={`Preview page ${page + 1}`} fill className="object-contain p-2" />
              {page > 0 && (
                <button onClick={() => setPage(p => p - 1)} className="absolute left-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50">
                  <FiChevronLeft />
                </button>
              )}
              {page < previews.length - 1 && (
                <button onClick={() => setPage(p => p + 1)} className="absolute right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50">
                  <FiChevronRight />
                </button>
              )}
            </div>
            <div className="flex justify-center gap-1 py-2">
              {previews.map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-2 h-2 rounded-full transition-colors ${i === page ? 'bg-violet-600' : 'bg-gray-300'}`} />
              ))}
            </div>
            <div className="px-4 pb-4 text-center">
              <p className="text-xs text-gray-500">Showing sample preview pages</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
