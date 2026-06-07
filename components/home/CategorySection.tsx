import Link from 'next/link'
import { CATEGORIES } from '@/lib/utils'
import {
  FiMonitor, FiShoppingBag, FiHome, FiBookOpen,
  FiActivity, FiHeart, FiSmile, FiTruck,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'

const CATEGORY_META: Record<string, { icon: IconType; color: string; bg: string }> = {
  'Electronics':   { icon: FiMonitor,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  'Fashion':       { icon: FiShoppingBag,color: 'text-pink-600',   bg: 'bg-pink-50' },
  'Home & Garden': { icon: FiHome,       color: 'text-green-600',  bg: 'bg-green-50' },
  'Books':         { icon: FiBookOpen,   color: 'text-amber-600',  bg: 'bg-amber-50' },
  'Sports':        { icon: FiActivity,   color: 'text-red-600',    bg: 'bg-red-50' },
  'Beauty':        { icon: FiHeart,      color: 'text-rose-600',   bg: 'bg-rose-50' },
  'Toys':          { icon: FiSmile,      color: 'text-yellow-600', bg: 'bg-yellow-50' },
  'Automotive':    { icon: FiTruck,      color: 'text-slate-600',  bg: 'bg-slate-50' },
}

export default function CategorySection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold text-gray-900">Shop by Category</h2>
        <Link href="/products" className="text-xs sm:text-sm text-brand-600 hover:underline font-medium">
          All →
        </Link>
      </div>

      {/* Mobile: horizontal scroll strip with right-fade hint. Desktop: grid */}
      <div className="relative sm:overflow-visible overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 sm:hidden" />
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1
                      sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible sm:pb-0">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat.name]
          const Icon = meta?.icon
          return (
            <Link
              key={cat.name}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="flex-shrink-0 w-[80px] sm:w-auto bg-white border border-brand-100 rounded-xl
                         p-2 sm:p-3 text-center hover:border-brand-400 hover:bg-brand-50
                         hover:shadow-purple transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto
                              mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-200
                              ${meta?.bg || 'bg-gray-100'}`}>
                {Icon && <Icon className={`text-lg ${meta?.color || 'text-gray-600'}`} />}
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-gray-700
                            group-hover:text-brand-700 transition-colors leading-tight">
                {cat.name}
              </p>
            </Link>
          )
        })}
      </div>
      </div>
    </section>
  )
}
