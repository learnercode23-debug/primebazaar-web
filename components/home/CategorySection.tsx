import Link from 'next/link'
import { CATEGORIES } from '@/lib/utils'

export default function CategorySection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold text-gray-900">Shop by Category</h2>
        <Link href="/products" className="text-xs sm:text-sm text-brand-600 hover:underline font-medium">
          All →
        </Link>
      </div>

      {/* Mobile: horizontal scroll strip. Desktop: grid */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1
                      sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible sm:pb-0">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            href={`/products?category=${encodeURIComponent(cat.name)}`}
            className="flex-shrink-0 w-[72px] sm:w-auto bg-white border border-brand-100 rounded-xl p-2 sm:p-3
                       text-center hover:border-brand-400 hover:bg-brand-50 hover:shadow-purple
                       transition-all group"
          >
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-200">
              {cat.icon}
            </div>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-700 group-hover:text-brand-700 transition-colors leading-tight">
              {cat.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
