export const dynamic = 'force-dynamic'

import HeroBanner from '@/components/home/HeroBanner'
import CategorySection from '@/components/home/CategorySection'
import DealOfTheDay from '@/components/home/DealOfTheDay'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi'

const TRUST_BADGES = [
  { icon: FiTruck,      title: 'Free Shipping',  desc: 'Orders over $50',     color: 'text-violet-600 bg-violet-50' },
  { icon: FiShield,     title: 'Secure Payment', desc: 'SSL encrypted',        color: 'text-indigo-600 bg-indigo-50' },
  { icon: FiRefreshCw,  title: 'Easy Returns',   desc: '30-day return',        color: 'text-purple-600 bg-purple-50' },
  { icon: FiHeadphones, title: '24/7 Support',   desc: "Always here",          color: 'text-fuchsia-600 bg-fuchsia-50' },
]

export default function HomePage() {
  return (
    <div>
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
        {/* Trust badges — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {TRUST_BADGES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white border border-brand-100 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:shadow-purple transition-all">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="text-sm sm:text-lg" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight">{title}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <CategorySection />
        <DealOfTheDay />
        <FeaturedProducts title="Featured Products" query="featured=true" limit={8} />
        <FeaturedProducts title="New Arrivals" query="sort=createdAt&order=desc" limit={8} />

        {/* Seller promo banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#4C1D95] p-6 sm:p-10 text-white text-center">
          <div className="relative">
            <span className="inline-block bg-amber-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mb-3">
              🚀 Seller Program
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">Become a Seller Today</h2>
            <p className="text-white/70 mb-5 sm:mb-7 text-sm sm:text-base max-w-md mx-auto">
              List your products and reach millions of customers. Set up your store in minutes.
            </p>
            <a href="/register?role=seller" className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full transition-all shadow-lg shadow-amber-500/30 text-sm sm:text-base">
              Start Selling →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
