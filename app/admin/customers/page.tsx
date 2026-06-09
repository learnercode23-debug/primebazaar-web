'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiUsers, FiDownload } from 'react-icons/fi'

const SEGMENTS = [
  { key: 'champions',    label: '🏆 Champions',    color: 'bg-violet-100 border-violet-300 text-violet-800', count: 284, avgLTV: 62400, freq: '4.2/mo', recency: '3 days', desc: 'Bought recently, buy often, spent the most' },
  { key: 'loyal',        label: '💜 Loyal',         color: 'bg-indigo-100 border-indigo-300 text-indigo-800', count: 512, avgLTV: 38200, freq: '2.8/mo', recency: '8 days', desc: 'Regular buyers with high spend' },
  { key: 'promising',    label: '🌟 Promising',     color: 'bg-blue-100 border-blue-300 text-blue-800',       count: 731, avgLTV: 18900, freq: '1.4/mo', recency: '12 days', desc: 'Recent buyers with growing frequency' },
  { key: 'at_risk',      label: '⚠️ At Risk',       color: 'bg-amber-100 border-amber-300 text-amber-800',    count: 312, avgLTV: 29100, freq: '0.6/mo', recency: '28 days', desc: 'Used to buy often but becoming inactive' },
  { key: 'hibernating',  label: '😴 Hibernating',   color: 'bg-orange-100 border-orange-300 text-orange-800', count: 468, avgLTV: 14200, freq: '0.2/mo', recency: '45 days', desc: 'Low spend and infrequent, inactive recently' },
  { key: 'lost',         label: '💔 Lost',           color: 'bg-red-100 border-red-300 text-red-800',          count: 198, avgLTV: 8600,  freq: '0.1/mo', recency: '90+ days', desc: 'Lowest RFM scores — likely churned' },
]

const MOCK_CUSTOMERS = [
  { name: 'Suman K.',    email: 's***@gmail.com', segment: 'champions',   ltv: 87400, orders: 42, last: '2 days ago' },
  { name: 'Priya M.',    email: 'p***@yahoo.com', segment: 'champions',   ltv: 64200, orders: 31, last: '1 day ago' },
  { name: 'Bikash T.',   email: 'b***@gmail.com', segment: 'loyal',       ltv: 51800, orders: 28, last: '5 days ago' },
  { name: 'Anita S.',    email: 'a***@gmail.com', segment: 'loyal',       ltv: 43600, orders: 24, last: '7 days ago' },
  { name: 'Rohan B.',    email: 'r***@hotmail.com', segment: 'promising', ltv: 21200, orders: 12, last: '10 days ago' },
  { name: 'Sunita B.',   email: 'su***@gmail.com', segment: 'at_risk',   ltv: 38900, orders: 19, last: '31 days ago' },
  { name: 'Deepak R.',   email: 'd***@gmail.com', segment: 'at_risk',    ltv: 29400, orders: 15, last: '47 days ago' },
  { name: 'Mina P.',     email: 'm***@gmail.com', segment: 'hibernating', ltv: 12400, orders: 6,  last: '52 days ago' },
]

export default function CustomerSegmentationPage() {
  const [active, setActive] = useState<string | null>(null)

  const seg = active ? SEGMENTS.find(s => s.key === active) : null
  const customers = active ? MOCK_CUSTOMERS.filter(c => c.segment === active) : MOCK_CUSTOMERS

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FiUsers className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Customer Segmentation</h1>
            <p className="text-sm text-gray-500">RFM (Recency · Frequency · Monetary) analysis</p>
          </div>
        </div>
        <button className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:border-violet-400 text-gray-700 px-4 py-2 rounded-xl font-semibold transition-colors">
          <FiDownload /> Export CSV
        </button>
      </div>

      {/* Segments grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {SEGMENTS.map(s => (
          <button key={s.key} onClick={() => setActive(active === s.key ? null : s.key)}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${s.color} ${active === s.key ? 'ring-2 ring-violet-500 ring-offset-2' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-base">{s.label}</span>
              <span className="text-2xl font-black">{s.count.toLocaleString()}</span>
            </div>
            <p className="text-xs opacity-80 mb-3">{s.desc}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="opacity-70">Avg LTV</p><p className="font-bold">Rs.{(s.avgLTV/1000).toFixed(0)}K</p></div>
              <div><p className="opacity-70">Frequency</p><p className="font-bold">{s.freq}</p></div>
              <div><p className="opacity-70">Last seen</p><p className="font-bold">{s.recency}</p></div>
            </div>
          </button>
        ))}
      </div>

      {/* Total customers bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-gray-900">Segment Distribution</p>
          <p className="text-sm text-gray-500">{SEGMENTS.reduce((s, x) => s + x.count, 0).toLocaleString()} total customers</p>
        </div>
        <div className="flex h-6 rounded-full overflow-hidden">
          {SEGMENTS.map((s, i) => {
            const total = SEGMENTS.reduce((a, x) => a + x.count, 0)
            const pct = (s.count / total) * 100
            const colors = ['bg-violet-600','bg-indigo-500','bg-blue-500','bg-amber-500','bg-orange-500','bg-red-500']
            return <div key={s.key} className={`${colors[i]} transition-all`} style={{ width: `${pct}%` }} title={`${s.label}: ${s.count}`} />
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {SEGMENTS.map((s, i) => {
            const colors = ['bg-violet-600','bg-indigo-500','bg-blue-500','bg-amber-500','bg-orange-500','bg-red-500']
            return (
              <span key={s.key} className="flex items-center gap-1 text-xs text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${colors[i]}`} />{s.label.split(' ').slice(1).join(' ')}
              </span>
            )
          })}
        </div>
      </div>

      {/* Customer table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900">{seg ? `${seg.label} Customers` : 'All Customers'}</h2>
          {active && <button onClick={() => setActive(null)} className="text-xs text-gray-400 hover:text-gray-700">Show all</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b bg-gray-50"><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Segment</th><th className="px-4 py-3 text-right">LTV</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Last Order</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody>
              {customers.map(c => {
                const s = SEGMENTS.find(x => x.key === c.segment)!
                return (
                  <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-right font-bold">Rs.{c.ltv.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{c.orders}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{c.last}</td>
                    <td className="px-4 py-3 text-right"><button className="text-xs text-violet-600 hover:underline font-semibold">Send offer</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
