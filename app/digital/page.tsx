import Link from 'next/link'
import type { Metadata } from 'next'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'Digital Downloads — Primepasal',
  description: 'Ebooks, software, music, courses, and digital content. Instant delivery after purchase.',
}

const CATEGORIES = [
  { emoji: '📚', label: 'eBooks',         href: '/products?category=Books&subcategory=ebooks',    desc: 'Fiction, non-fiction, textbooks' },
  { emoji: '🎓', label: 'Online Courses', href: '/products?category=Education',                   desc: 'Learn at your own pace' },
  { emoji: '🎵', label: 'Music',          href: '/products?category=Music',                       desc: 'Albums, soundtracks, ringtones' },
  { emoji: '💻', label: 'Software',       href: '/products?category=Software',                    desc: 'Antivirus, productivity, design' },
  { emoji: '🎮', label: 'Game Codes',     href: '/products?category=Gaming&subcategory=digital',  desc: 'Steam, PSN, Xbox codes' },
  { emoji: '🎨', label: 'Templates',      href: '/products?category=Design',                      desc: 'Canva, Figma, PPT templates' },
]

const PERKS = [
  { icon: '⚡', title: 'Instant delivery', desc: 'Download immediately after payment is confirmed' },
  { icon: '♾️',  title: 'No expiry',       desc: 'Access your purchases anytime, forever' },
  { icon: '🔒', title: 'Secure DRM',      desc: 'Licensed content with buyer protection' },
  { icon: '📱', title: 'Multi-device',    desc: 'Use on phone, tablet, and desktop' },
]

export default function DigitalPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">⚡</span>
              <span className="font-black text-2xl">Digital Downloads</span>
            </div>
            <p className="text-purple-100 text-base max-w-md">
              Ebooks, courses, software, and more. Buy once, download instantly — no shipping required.
            </p>
            <div className="flex gap-3 mt-4 text-sm flex-wrap">
              <span className="bg-white/20 px-3 py-1 rounded-full">⚡ Instant access</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">♾️ Keep forever</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">🔒 Buyer protected</span>
            </div>
          </div>
          <div className="text-7xl hidden sm:block">💾</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Categories */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Browse by type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(({ emoji, label, href, desc }) => (
              <Link key={label} href={href}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-center hover:border-violet-300 hover:shadow-md transition-all group">
                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">{emoji}</span>
                <p className="font-bold text-sm text-gray-900">{label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Perks */}
        <FadeIn>
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100 rounded-2xl p-6">
            <h2 className="font-black text-gray-900 text-lg mb-5 text-center">Why buy digital on Primepasal</h2>
            <div className="grid sm:grid-cols-4 gap-5">
              {PERKS.map(({ icon, title, desc }) => (
                <div key={title} className="text-center">
                  <p className="text-3xl mb-2">{icon}</p>
                  <p className="font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Top picks banner */}
        <FadeIn>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/products?category=Books" className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-6 hover:opacity-90 transition-opacity">
              <p className="text-3xl mb-2">📚</p>
              <p className="font-black text-xl mb-1">Bestselling eBooks</p>
              <p className="text-white/80 text-sm">From Rs.99 · Instant download</p>
            </Link>
            <Link href="/products?category=Education" className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-6 hover:opacity-90 transition-opacity">
              <p className="text-3xl mb-2">🎓</p>
              <p className="font-black text-xl mb-1">Online Courses</p>
              <p className="text-white/80 text-sm">Learn from experts · Self-paced</p>
            </Link>
          </div>
        </FadeIn>

        <div className="text-center py-4">
          <Link href="/products?category=Books" className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-full transition-colors">
            Browse all digital products →
          </Link>
        </div>
      </div>
    </div>
  )
}
