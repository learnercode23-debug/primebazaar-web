import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers — Primepasal',
  description: 'Join the Primepasal team. Explore open positions and help us build Nepal\'s best e-commerce platform.',
}

const OPENINGS = [
  { title: 'Frontend Engineer',    dept: 'Engineering',  type: 'Full-time', location: 'Kathmandu / Remote' },
  { title: 'Backend Engineer',     dept: 'Engineering',  type: 'Full-time', location: 'Kathmandu / Remote' },
  { title: 'Product Manager',      dept: 'Product',      type: 'Full-time', location: 'Kathmandu' },
  { title: 'UX Designer',          dept: 'Design',       type: 'Full-time', location: 'Remote' },
  { title: 'Marketing Specialist', dept: 'Marketing',    type: 'Full-time', location: 'Kathmandu' },
  { title: 'Customer Support',     dept: 'Operations',   type: 'Part-time', location: 'Remote' },
]

export default function CareersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full mb-4">We&apos;re Hiring</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Build the Future of Commerce</h1>
        <p className="text-gray-600 max-w-xl mx-auto text-base">
          Join a passionate team making e-commerce accessible to everyone in Nepal. We value curiosity, ownership, and impact.
        </p>
      </div>

      {/* Perks */}
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {[
          { emoji: '🏡', title: 'Remote-first', desc: 'Work from anywhere in Nepal' },
          { emoji: '📈', title: 'Growth', desc: 'Learning budget & mentorship' },
          { emoji: '🏥', title: 'Health', desc: 'Medical insurance for you & family' },
        ].map(({ emoji, title, desc }) => (
          <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
            <div className="text-3xl mb-2">{emoji}</div>
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Open roles */}
      <h2 className="text-xl font-black text-gray-900 mb-5">Open Positions</h2>
      <div className="space-y-3 mb-10">
        {OPENINGS.map((job) => (
          <div key={job.title} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:border-violet-200 transition-colors">
            <div>
              <p className="font-bold text-gray-900">{job.title}</p>
              <p className="text-sm text-gray-500">{job.dept} · {job.location}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium">{job.type}</span>
              <a href="mailto:careers@primepasal.com" className="text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline">
                Apply →
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6 text-center">
        <p className="font-bold text-gray-900 mb-1">Don&apos;t see a fit?</p>
        <p className="text-sm text-gray-600 mb-4">Send your CV anyway — we&apos;re always looking for great people.</p>
        <a href="mailto:careers@primepasal.com" className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Send Open Application
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Back to Primepasal</Link>
      </div>
    </div>
  )
}
