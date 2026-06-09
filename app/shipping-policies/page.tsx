import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipping Policies — PrimePasal',
  description: 'Learn about PrimePasal shipping rates, delivery timelines, free shipping eligibility, and coverage areas across Nepal.',
}

const ZONES = [
  { zone: 'Kathmandu Valley',  standard: '1–2 days',  express: 'Same day',  fee: 'FREE on orders Rs.999+' },
  { zone: 'Major Cities',      standard: '2–3 days',  express: '1–2 days',  fee: 'Rs.80–120' },
  { zone: 'Hill Districts',    standard: '3–5 days',  express: 'N/A',        fee: 'Rs.150–200' },
  { zone: 'Remote Areas',      standard: '5–7 days',  express: 'N/A',        fee: 'Rs.200–350' },
]

const FAQ = [
  { q: 'When does my order ship?', a: 'In-stock items are dispatched within 24 hours of payment confirmation. Orders placed before 3 PM on working days ship the same day.' },
  { q: 'How do I track my order?', a: 'Once your order ships you will receive an SMS with a tracking link. You can also track from My Orders → Track Order.' },
  { q: 'What if my order is delayed?', a: 'If your order has not arrived by the estimated delivery date, contact support and we will investigate within 24 hours.' },
  { q: 'Can I change my delivery address?', a: 'Address changes are accepted up to 1 hour after placing the order. After that the order may already be packed.' },
  { q: 'Do you ship internationally?', a: 'Currently we deliver only within Nepal. International shipping is on our roadmap.' },
  { q: 'What happens if I miss the delivery?', a: 'Our delivery partner will attempt delivery twice. After two failed attempts the order is returned and a refund is processed.' },
]

export default function ShippingPoliciesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full mb-4">📦 Shipping</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Shipping Policies</h1>
        <p className="text-gray-600 max-w-xl mx-auto">Fast, reliable delivery across Nepal. Free shipping on orders above Rs.999.</p>
      </div>

      {/* Free shipping banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-6 mb-10 flex items-center gap-5">
        <div className="text-4xl">🚚</div>
        <div>
          <p className="font-black text-xl mb-1">Free Shipping on Rs.999+</p>
          <p className="text-white/80 text-sm">Add items worth Rs.999 or more and get free standard delivery anywhere in Nepal.</p>
        </div>
      </div>

      {/* Delivery zones */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-4">Delivery Areas & Timelines</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Zone</th>
                <th className="text-left px-4 py-3">Standard</th>
                <th className="text-left px-4 py-3">Express</th>
                <th className="text-left px-4 py-3">Shipping Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ZONES.map((z) => (
                <tr key={z.zone} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{z.zone}</td>
                  <td className="px-4 py-3 text-gray-600">{z.standard}</td>
                  <td className="px-4 py-3 text-gray-600">{z.express}</td>
                  <td className="px-4 py-3">
                    <span className={z.fee.startsWith('FREE') ? 'text-green-600 font-bold' : 'text-gray-700'}>
                      {z.fee}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Delivery times are estimates and may vary during peak seasons or adverse weather.</p>
      </section>

      {/* Key policies */}
      <section className="grid sm:grid-cols-2 gap-4 mb-10">
        {[
          { icon: '⏱️', title: 'Order Cut-off Time', desc: 'Orders placed before 3 PM on working days are dispatched the same day. Orders after 3 PM ship the next working day.' },
          { icon: '📍', title: 'Tracking', desc: 'Every shipment gets a tracking number. Track in real time from My Orders or via the SMS link sent at dispatch.' },
          { icon: '📦', title: 'Packaging', desc: 'All items are packaged securely. Fragile and high-value items receive extra protective packaging at no extra cost.' },
          { icon: '🔄', title: 'Failed Delivery', desc: 'Two delivery attempts are made. If both fail, your order returns to us and a full refund is initiated within 3–5 business days.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-2xl mb-2">{icon}</p>
            <p className="font-bold text-gray-900 mb-1">{title}</p>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm group">
              <summary className="px-5 py-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between">
                {q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform text-sm">▼</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6 text-center">
        <p className="font-bold text-gray-900 mb-1">Still have questions?</p>
        <p className="text-sm text-gray-600 mb-4">Our support team is available 24/7 to help you.</p>
        <Link href="/support" className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm">
          Contact Support
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Back to PrimePasal</Link>
      </div>
    </div>
  )
}
