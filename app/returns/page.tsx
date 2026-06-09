import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returns & Refunds — Primepasal',
  description: 'Primepasal\'s 7-day return policy. Learn how to return items, get refunds, and resolve order issues.',
}

const STEPS = [
  { step: '1', title: 'Start your return', desc: 'Go to My Orders, select the item, and tap "Return item". Choose your reason and upload photos if needed.' },
  { step: '2', title: 'Pack the item', desc: 'Place the item in its original packaging (if available) with all accessories and tags intact.' },
  { step: '3', title: 'Drop-off or pickup', desc: 'Drop it at any BlueDart / Delhivery partner point, or schedule a free home pickup from your address.' },
  { step: '4', title: 'Refund processed', desc: 'Once we receive and inspect the item (2–5 business days), your refund will be credited within 3–7 days.' },
]

const ELIGIBLE = [
  'Damaged or defective items',
  'Wrong item delivered',
  'Item not as described (size, colour, model)',
  'Missing parts or accessories',
]

const NOT_ELIGIBLE = [
  'Items returned after 7 days of delivery',
  'Used or washed clothing',
  'Opened software, digital downloads, or game codes',
  'Perishable goods and groceries',
  'Custom or personalised products',
  'Undergarments and swimwear (hygiene reasons)',
]

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Hassle-Free Returns</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Returns & Refunds</h1>
        <p className="text-gray-600">
          Not happy? Return most items within <strong>7 days</strong> of delivery — no questions asked.
        </p>
      </div>

      {/* Steps */}
      <h2 className="text-lg font-black text-gray-900 mb-4">How to return an item</h2>
      <div className="space-y-3 mb-10">
        {STEPS.map(({ step, title, desc }) => (
          <div key={step} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">
              {step}
            </div>
            <div>
              <p className="font-bold text-gray-900">{title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        {/* Eligible */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
            Eligible for return
          </h3>
          <ul className="space-y-2">
            {ELIGIBLE.map(item => (
              <li key={item} className="text-sm text-gray-700 flex gap-2">
                <span className="text-green-500 mt-0.5 flex-shrink-0">●</span>{item}
              </li>
            ))}
          </ul>
        </div>

        {/* Not eligible */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✕</span>
            Not eligible
          </h3>
          <ul className="space-y-2">
            {NOT_ELIGIBLE.map(item => (
              <li key={item} className="text-sm text-gray-700 flex gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">●</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Refund timeline */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="font-black text-gray-900 mb-4">Refund timeline</h2>
        <div className="space-y-3">
          {[
            { method: 'Original payment method (card / wallet)', time: '3–7 business days after item received' },
            { method: 'Primepasal credit (store balance)',        time: 'Instant once return is approved' },
            { method: 'Bank transfer (NEFT / Fonepay)',           time: '5–10 business days' },
          ].map(({ method, time }) => (
            <div key={method} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <span className="text-sm text-gray-700">{method}</span>
              <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">{time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/orders" className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm text-center">
          Go to My Orders
        </Link>
        <Link href="/support" className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors text-sm text-center">
          Contact Support
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Back to Primepasal</Link>
      </div>
    </div>
  )
}
