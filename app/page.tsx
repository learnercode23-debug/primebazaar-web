// Static shell — every section below is a client component that fetches its own
// data from /api, so the server HTML never changes and can be CDN-cached.
import Link from 'next/link'
import HeroBanner from '@/components/home/HeroBanner'
import CategorySection from '@/components/home/CategorySection'
import DealOfTheDay from '@/components/home/DealOfTheDay'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import RecentlyViewed from '@/components/product/RecentlyViewed'
import PersonalizedForYou from '@/components/home/PersonalizedForYou'
import LightningDealsSection from '@/components/home/LightningDealsSection'
import FadeIn from '@/components/ui/FadeIn'
import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi'

const MARQUEE_ITEMS = [
  '🚀 Free shipping on orders above Rs. 999',
  '🔥 Flash Sale — Up to 50% off today',
  '📦 Same-day dispatch on select items',
  '⭐ Rated 4.8★ by 10,000+ customers',
  '🎁 New users get 15% off their first order',
  '🔒 100% secure checkout guaranteed',
  '🏪 1,000+ verified sellers on PrimePasal',
]

const TRUST_BADGES = [
  { icon: FiTruck,      title: 'Free Shipping',  desc: 'Orders over Rs.999',  color: 'text-violet-600 bg-violet-50', href: '/products?sort=createdAt&order=desc' },
  { icon: FiShield,     title: 'Secure Payment', desc: 'SSL encrypted',        color: 'text-indigo-600 bg-indigo-50', href: '/about#payment' },
  { icon: FiRefreshCw,  title: 'Easy Returns',   desc: '7-day return policy',  color: 'text-purple-600 bg-purple-50', href: '/support#returns' },
  { icon: FiHeadphones, title: '24/7 Support',   desc: "Always here",          color: 'text-fuchsia-600 bg-fuchsia-50', href: '/support' },
]

export default function HomePage() {
  return (
    <div>
      <HeroBanner />

      {/* Scrolling announcement bar */}
      <div className="bg-[#1E1B4B] overflow-hidden border-y border-violet-800/40">
        <div className="animate-marquee py-2">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="whitespace-nowrap px-8 text-[11px] sm:text-xs font-medium text-violet-200 border-r border-violet-700/50">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
        {/* Trust badges — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {TRUST_BADGES.map(({ icon: Icon, title, desc, color, href }, i) => (
            <FadeIn key={title} delay={i * 80}>
              <Link href={href} className="bg-white border border-brand-100 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:shadow-purple hover:border-violet-200 transition-all cursor-pointer h-full">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="text-sm sm:text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight">{title}</p>
                  <p className="text-xs text-gray-500 hidden sm:block">{desc}</p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>

        <FadeIn><CategorySection /></FadeIn>
        <FadeIn><DealOfTheDay /></FadeIn>

        {/* Lightning Deals */}
        <FadeIn>
          <LightningDealsSection />
        </FadeIn>

        <FadeIn><FeaturedProducts title="Featured Products" query="sort=rating&order=desc" limit={8} /></FadeIn>
        <FadeIn><FeaturedProducts title="New Arrivals" query="sort=createdAt&order=desc" limit={8} /></FadeIn>

        <RecentlyViewed />
        <PersonalizedForYou />

        {/* Seller promo banner */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#4C1D95] p-6 sm:p-10 text-white text-center">
            <div className="relative">
              <span className="inline-block bg-amber-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mb-3">
                🚀 Seller Program
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">Become a Seller Today</h2>
              <p className="text-white/70 mb-5 sm:mb-7 text-sm sm:text-base max-w-md mx-auto">
                List your products and reach millions of customers. Set up your store in minutes.
              </p>
              <Link href="/register?role=seller" className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full transition-all shadow-lg shadow-amber-500/30 text-sm sm:text-base">
                Start Selling →
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
