import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Press & Media — Primepasal',
  description: 'Media resources, press releases, and news about Primepasal.',
}

const RELEASES = [
  { date: 'June 2025',    title: 'Primepasal Surpasses 10,000 Registered Sellers', summary: 'Nepal\'s fastest-growing marketplace hits a major seller milestone, expanding product selection across all categories.' },
  { date: 'March 2025',   title: 'Primepasal Launches Same-Day Delivery in Kathmandu', summary: 'Customers in the Kathmandu Valley can now receive orders within hours with our new express delivery network.' },
  { date: 'January 2025', title: 'Primepasal Raises Seed Funding to Expand Operations', summary: 'The company announces a seed round to grow its logistics network and technology infrastructure across Nepal.' },
]

export default function PressPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Newsroom</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Press & Media</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Official press releases and media resources from Primepasal. For media inquiries contact{' '}
          <a href="mailto:press@primepasal.com" className="text-violet-600 hover:underline">press@primepasal.com</a>.
        </p>
      </div>

      {/* Press releases */}
      <h2 className="text-xl font-black text-gray-900 mb-5">Press Releases</h2>
      <div className="space-y-4 mb-12">
        {RELEASES.map((release) => (
          <div key={release.title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-violet-200 transition-colors">
            <span className="text-xs text-gray-400 font-medium">{release.date}</span>
            <h3 className="font-black text-gray-900 mt-1 mb-2 text-base">{release.title}</h3>
            <p className="text-sm text-gray-600">{release.summary}</p>
          </div>
        ))}
      </div>

      {/* Media kit */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6">
        <h2 className="font-black text-gray-900 mb-1">Media Kit</h2>
        <p className="text-sm text-gray-600 mb-4">Download our logo, brand guidelines, and product screenshots.</p>
        <a href="mailto:press@primepasal.com" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Request Media Kit
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Back to Primepasal</Link>
      </div>
    </div>
  )
}
