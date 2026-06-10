'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FiMail, FiX, FiCheck, FiMoreHorizontal } from 'react-icons/fi'
import { FaWhatsapp, FaFacebookF, FaTwitter, FaTelegramPlane, FaViber } from 'react-icons/fa'

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  url: string
  title?: string
}

// YouTube-style share sheet: a row of circular network buttons + a copy-link pill.
// Bottom sheet on mobile, centered card on desktop.
export default function ShareSheet({ open, onClose, url, title = '' }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const enc = encodeURIComponent
  const text = title ? `${title}\n${url}` : url

  const targets = [
    { name: 'WhatsApp', icon: <FaWhatsapp className="text-2xl" />,      bg: 'bg-green-500',  href: `https://wa.me/?text=${enc(text)}`, external: true },
    { name: 'Facebook', icon: <FaFacebookF className="text-xl" />,      bg: 'bg-blue-600',   href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, external: true },
    { name: 'Email',    icon: <FiMail className="text-2xl" />,          bg: 'bg-gray-500',   href: `mailto:?subject=${enc(title || 'Check this out on PrimePasal')}&body=${enc(text)}`, external: false },
    { name: 'X',        icon: <FaTwitter className="text-xl" />,        bg: 'bg-gray-900',   href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, external: true },
    { name: 'Telegram', icon: <FaTelegramPlane className="text-2xl" />, bg: 'bg-sky-500',    href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`, external: true },
    { name: 'Viber',    icon: <FaViber className="text-2xl" />,         bg: 'bg-purple-600', href: `viber://forward?text=${enc(text)}`, external: false },
  ]

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Sheet (mobile) / centered card (desktop) */}
      <div className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-slide-in-up">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-gray-900">Share</h3>
          <button onClick={onClose} aria-label="Close share sheet" className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Network icons — horizontally scrollable row like YouTube */}
        <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 mb-5">
          {targets.map(t => (
            <a
              key={t.name}
              href={t.href}
              {...(t.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={onClose}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <span className={`w-14 h-14 rounded-full ${t.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {t.icon}
              </span>
              <span className="text-xs text-gray-600 font-medium">{t.name}</span>
            </a>
          ))}
          {canNativeShare && (
            <button
              onClick={() => { navigator.share({ title: title || 'PrimePasal', url }).catch(() => {}); onClose() }}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <span className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 group-hover:scale-110 transition-transform">
                <FiMoreHorizontal className="text-2xl" />
              </span>
              <span className="text-xs text-gray-600 font-medium">More</span>
            </button>
          )}
        </div>

        {/* Copy-link pill */}
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full pl-4 pr-1.5 py-1.5">
          <p className="flex-1 text-sm text-gray-700 truncate">{url}</p>
          <button
            onClick={copy}
            className="flex-shrink-0 bg-gray-900 hover:bg-black text-white text-sm font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
          >
            {copied ? <><FiCheck /> Copied</> : 'Copy'}
          </button>
        </div>
      </div>
    </>
  )
}
