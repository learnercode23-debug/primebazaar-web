import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investor Relations — PrimePasal',
  description: 'Investor information, financials, and governance details for PrimePasal.',
}

const METRICS = [
  { label: 'Registered Sellers', value: '10,000+' },
  { label: 'Monthly Active Buyers', value: '250,000+' },
  { label: 'Products Listed', value: '500,000+' },
  { label: 'Cities Served', value: '50+' },
]

export default function InvestorRelationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Investor Relations</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Building Nepal&apos;s Commerce Infrastructure</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          PrimePasal is on a mission to digitise commerce across Nepal. We connect local sellers with buyers nationwide through technology.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {METRICS.map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-2xl font-black text-violet-600">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Investment thesis */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-black text-gray-900 text-lg mb-3">Our Opportunity</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2"><span className="text-violet-500 mt-0.5">▸</span>Nepal&apos;s e-commerce market is growing at 35% YoY with less than 5% penetration.</li>
          <li className="flex gap-2"><span className="text-violet-500 mt-0.5">▸</span>We are the only marketplace with pan-Nepal logistics reaching 50+ cities.</li>
          <li className="flex gap-2"><span className="text-violet-500 mt-0.5">▸</span>Proprietary seller tools and data analytics create a moat against new entrants.</li>
          <li className="flex gap-2"><span className="text-violet-500 mt-0.5">▸</span>Expanding into financial services (Buy Now Pay Later) and B2B wholesale in 2026.</li>
        </ul>
      </div>

      {/* Contact */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 text-center">
        <p className="font-bold text-gray-900 mb-1">Investor Inquiries</p>
        <p className="text-sm text-gray-600 mb-4">For investor relations, financials, or partnership discussions:</p>
        <a href="mailto:investors@primepasal.com" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Contact IR Team
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Back to PrimePasal</Link>
      </div>
    </div>
  )
}
