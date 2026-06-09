import Link from 'next/link'
import type { Metadata } from 'next'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'Primepasal Fresh — Groceries & Fresh Produce',
  description: 'Order fresh fruits, vegetables, dairy, and pantry essentials. Same-day delivery in Kathmandu.',
}

const CATEGORIES = [
  { emoji: '🥦', label: 'Vegetables',   q: 'category=Groceries&subcategory=Vegetables' },
  { emoji: '🍎', label: 'Fruits',        q: 'category=Groceries&subcategory=Fruits' },
  { emoji: '🥛', label: 'Dairy',         q: 'category=Groceries&subcategory=Dairy' },
  { emoji: '🍗', label: 'Meat & Fish',   q: 'category=Groceries&subcategory=Meat' },
  { emoji: '🌾', label: 'Grains & Rice', q: 'category=Groceries&subcategory=Grains' },
  { emoji: '🫙', label: 'Pantry',        q: 'category=Groceries&subcategory=Pantry' },
  { emoji: '🧴', label: 'Household',     q: 'category=Groceries&subcategory=Household' },
  { emoji: '🧸', label: 'Baby & Kids',   q: 'category=Groceries&subcategory=Baby' },
]

export default function FreshPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🥬</span>
              <span className="font-black text-2xl">Primepasal Fresh</span>
            </div>
            <p className="text-green-100 text-base max-w-md">
              Fresh groceries delivered to your door. Daily fresh produce, dairy, and pantry essentials.
            </p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">🚚 Same-day delivery</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">✓ Quality guaranteed</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">🆓 Free on Rs.500+</span>
            </div>
          </div>
          <div className="text-7xl hidden sm:block">🛒</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Categories */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Shop by category</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map(({ emoji, label, q }) => (
              <Link key={label} href={`/products?${q}`}
                className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-3 hover:border-green-300 hover:shadow-md transition-all text-center group">
                <span className="text-2xl group-hover:scale-110 transition-transform">{emoji}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-700 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Deals banner */}
        <FadeIn>
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-black text-gray-900 text-lg mb-1">🌿 Today&apos;s Fresh Deals</p>
              <p className="text-sm text-gray-600">Up to 30% off seasonal produce — today only</p>
            </div>
            <Link href="/deals" className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-colors whitespace-nowrap">
              Shop deals →
            </Link>
          </div>
        </FadeIn>

        {/* Products */}
        <FadeIn>
          <FeaturedProducts title="Fresh picks for you" query="category=Groceries&sort=createdAt&order=desc" limit={8} />
        </FadeIn>
        <FadeIn>
          <FeaturedProducts title="Best sellers in Grocery" query="category=Groceries&sort=rating&order=desc" limit={8} />
        </FadeIn>
      </div>
    </div>
  )
}
