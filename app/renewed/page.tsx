import Link from 'next/link'
import type { Metadata } from 'next'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'Primepasal Renewed — Certified Refurbished Products',
  description: 'Shop certified refurbished electronics and devices at up to 50% off. Each product inspected, tested, and backed by warranty.',
}

const GRADES = [
  { grade: 'Like New',    color: 'bg-green-100 text-green-800 border-green-200',    desc: 'No visible wear. Fully functional. May come in non-original packaging.' },
  { grade: 'Excellent',   color: 'bg-blue-100 text-blue-800 border-blue-200',       desc: 'Very minor cosmetic marks. Fully functional with all original accessories.' },
  { grade: 'Good',        color: 'bg-amber-100 text-amber-800 border-amber-200',    desc: 'Light scratches or dents. Fully functional. May be missing some accessories.' },
]

export default function RenewedPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">♻️</span>
              <span className="font-black text-2xl">Primepasal Renewed</span>
            </div>
            <p className="text-blue-100 text-base max-w-md">
              Certified refurbished products — inspected, tested, and backed by a 6-month warranty. Save up to 50%.
            </p>
            <div className="flex gap-3 mt-4 text-sm flex-wrap">
              <span className="bg-white/20 px-3 py-1 rounded-full">✅ Inspected & tested</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">🛡️ 6-month warranty</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">↩️ 7-day returns</span>
            </div>
          </div>
          <div className="text-7xl hidden sm:block">📱</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Grade guide */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Condition grades explained</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {GRADES.map(({ grade, color, desc }) => (
              <div key={grade} className={`rounded-2xl border p-4 ${color}`}>
                <p className="font-black text-base mb-1">{grade}</p>
                <p className="text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust banner */}
        <FadeIn>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 grid sm:grid-cols-4 gap-4">
            {[
              { icon: '🔍', title: '80-point inspection', desc: 'Every device tested by experts' },
              { icon: '🔋', title: 'Battery health >80%', desc: 'Guaranteed on all devices' },
              { icon: '📦', title: 'Clean packaging', desc: 'Sealed and ready to use' },
              { icon: '📞', title: 'Dedicated support', desc: 'Renewed product helpline' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Products */}
        <FadeIn>
          <FeaturedProducts title="Top Renewed Electronics" query="category=Electronics&sort=discountPercent&order=desc" limit={8} />
        </FadeIn>
        <FadeIn>
          <FeaturedProducts title="Renewed Phones & Tablets" query="category=Electronics&sort=rating&order=desc" limit={4} />
        </FadeIn>

        <div className="text-center py-4">
          <Link href="/products?category=Electronics&sort=discountPercent&order=desc" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-full transition-colors">
            Browse all Renewed →
          </Link>
        </div>
      </div>
    </div>
  )
}
