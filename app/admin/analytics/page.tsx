'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiTrendingUp, FiTrendingDown, FiUsers, FiShoppingCart, FiDollarSign, FiAlertCircle } from 'react-icons/fi'

// ─── Simulated data ───────────────────────────────────────────────────────────
const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']

const COHORT: { month: string; retention: number[] }[] = [
  { month: 'Jan', retention: [100, 42, 28, 22, 18, 15, 13] },
  { month: 'Feb', retention: [100, 38, 25, 19, 16, 13, 11] },
  { month: 'Mar', retention: [100, 45, 31, 24, 20, 17, 14] },
  { month: 'Apr', retention: [100, 41, 27, 21, 17, 14] },
  { month: 'May', retention: [100, 39, 26, 20, 16] },
  { month: 'Jun', retention: [100, 43, 29, 22] },
]

const MONTHLY_REV = [120000,145000,132000,178000,165000,210000,198000,225000,242000,261000,248000,290000]
const MONTHLY_ORDERS = [320,390,355,480,445,560,530,600,645,700,665,780]
const LTV_BY_COHORT = [4200,3800,4500,4100,3900,4300]

const FUNNEL = [
  { label: 'Visits',      value: 85400, pct: 100 },
  { label: 'Product Page',value: 41200, pct: 48 },
  { label: 'Add to Cart', value: 18700, pct: 22 },
  { label: 'Checkout',    value: 9400,  pct: 11 },
  { label: 'Purchased',   value: 6800,  pct: 8 },
]

const TRAFFIC_PAGES = [
  { page: '/', views: 48200, bounce: '38%' },
  { page: '/products', views: 31400, bounce: '42%' },
  { page: '/products/[id]', views: 26800, bounce: '29%' },
  { page: '/cart', views: 14200, bounce: '51%' },
  { page: '/checkout', views: 9400, bounce: '22%' },
]

const ABANDONED = [
  { user: 'Suman K.', email: 's***@gmail.com', items: 3, value: 12400, lastSeen: '2h ago', step: 'Checkout' },
  { user: 'Priya M.', email: 'p***@yahoo.com', items: 1, value: 5800,  lastSeen: '4h ago', step: 'Cart' },
  { user: 'Rohan B.', email: 'r***@gmail.com', items: 5, value: 28900, lastSeen: '6h ago', step: 'Payment' },
  { user: 'Anita S.', email: 'a***@gmail.com', items: 2, value: 9200,  lastSeen: '8h ago', step: 'Cart' },
  { user: 'Bikash T.', email: 'b***@hotmail.com', items: 4, value: 18600, lastSeen: '12h ago', step: 'Address' },
]

const DEVICES = [{ label: 'Mobile', pct: 68, color: '#7c3aed' }, { label: 'Desktop', pct: 27, color: '#4f46e5' }, { label: 'Tablet', pct: 5, color: '#a78bfa' }]

// ─── Chart components ─────────────────────────────────────────────────────────
function BarChart({ data, color = '#7c3aed', height = 120 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data)
  return (
    <svg viewBox={`0 0 ${data.length * 30} ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const barH = (v / max) * (height - 20)
        return (
          <g key={i}>
            <rect x={i * 30 + 4} y={height - 20 - barH} width={22} height={barH} rx="3" fill={color} opacity="0.85" />
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ data, color = '#7c3aed', height = 100 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 300; const h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 16) - 8}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${pts.join(' L ')} L ${w},${h} L 0,${h} Z`} fill="url(#lg)" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CohortHeatmap() {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs text-center w-full">
        <thead>
          <tr>
            <th className="py-1 px-2 text-left text-gray-500 font-semibold">Cohort</th>
            {['M0','M1','M2','M3','M4','M5','M6'].map(m => (
              <th key={m} className="py-1 px-3 text-gray-500 font-semibold">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COHORT.map(({ month, retention }) => (
            <tr key={month}>
              <td className="py-1.5 px-2 text-left font-bold text-gray-700">{month}</td>
              {retention.map((pct, i) => {
                const intensity = pct / 100
                const bg = i === 0 ? '#7c3aed' : `rgba(124,58,237,${0.1 + intensity * 0.7})`
                const text = i === 0 || intensity > 0.4 ? 'white' : '#374151'
                return (
                  <td key={i} className="py-1.5 px-3 rounded font-semibold" style={{ backgroundColor: bg, color: text }}>
                    {pct}%
                  </td>
                )
              })}
              {Array.from({ length: 7 - retention.length }).map((_, i) => (
                <td key={`e${i}`} className="py-1.5 px-3 text-gray-200">—</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Tab = 'overview' | 'cohort' | 'ltv' | 'churn' | 'traffic' | 'conversions' | 'abandoned'

export default function AdvancedAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'cohort',       label: 'Cohort' },
    { key: 'ltv',          label: 'LTV' },
    { key: 'churn',        label: 'Churn' },
    { key: 'traffic',      label: 'Traffic' },
    { key: 'conversions',  label: 'Conversions' },
    { key: 'abandoned',    label: 'Abandoned Carts' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <FiTrendingUp className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Advanced Analytics</h1>
          <p className="text-sm text-gray-500">Cohort retention, LTV, churn, traffic & conversion data</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Revenue', value: 'Rs.2,90,000', change: '+17%', up: true, icon: FiDollarSign },
              { label: 'Orders (30d)',     value: '780',          change: '+15%', up: true, icon: FiShoppingCart },
              { label: 'New Customers',   value: '1,240',        change: '+8%',  up: true, icon: FiUsers },
              { label: 'Avg Order Value', value: 'Rs.3,718',     change: '-3%',  up: false, icon: FiTrendingUp },
            ].map(({ label, value, change, up, icon: Icon }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <Icon className="text-violet-400 text-lg" />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
                  {up ? <FiTrendingUp /> : <FiTrendingDown />} {change} vs last month
                </p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">Revenue (12 months)</h2>
              <BarChart data={MONTHLY_REV} />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                {MONTHS.map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">Orders (12 months)</h2>
              <LineChart data={MONTHLY_ORDERS} color="#4f46e5" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                {MONTHS.map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cohort ── */}
      {tab === 'cohort' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-black text-gray-900 mb-1">Customer Retention Cohort</h2>
            <p className="text-xs text-gray-500 mb-5">% of customers from each monthly cohort still active after N months</p>
            <CohortHeatmap />
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(124,58,237,0.15)' }} /> Low retention</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'rgba(124,58,237,0.6)' }} /> High retention</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-600" /> 100% (cohort start)</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Avg M1 Retention', value: '41%', desc: 'Customers who return after 1st month' },
              { label: 'Avg M3 Retention', value: '21%', desc: 'Customers active at 3 months' },
              { label: 'Avg M6 Retention', value: '14%', desc: 'Customers active at 6 months' },
            ].map(({ label, value, desc }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-3xl font-black text-violet-700">{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LTV ── */}
      {tab === 'ltv' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Avg Customer LTV', value: 'Rs.4,183', sub: 'Lifetime spend per customer' },
              { label: 'Payback Period',   value: '3.2 months', sub: 'Avg time to recover CAC' },
              { label: 'LTV : CAC Ratio',  value: '4.8×', sub: 'Healthy is > 3×' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-3xl font-black text-violet-700">{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">LTV by Acquisition Cohort (Rs.)</h2>
            <BarChart data={LTV_BY_COHORT} color="#4f46e5" height={140} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              {['Jan','Feb','Mar','Apr','May','Jun'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-3">Top Customers by LTV</h2>
            <div className="space-y-2">
              {[
                { name: 'Suman K.', orders: 42, ltv: 'Rs.87,400', tier: '💎 Diamond' },
                { name: 'Priya M.', orders: 31, ltv: 'Rs.64,200', tier: '💜 Platinum' },
                { name: 'Bikash T.',orders: 28, ltv: 'Rs.51,800', tier: '💜 Platinum' },
                { name: 'Anita S.', orders: 24, ltv: 'Rs.43,600', tier: '🥇 Gold' },
                { name: 'Rohan B.', orders: 19, ltv: 'Rs.35,200', tier: '🥇 Gold' },
              ].map(({ name, orders, ltv, tier }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-black text-violet-700">{name[0]}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{orders} orders · {tier}</p>
                    </div>
                  </div>
                  <p className="font-black text-gray-900 text-sm">{ltv}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Churn ── */}
      {tab === 'churn' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Monthly Churn Rate', value: '4.2%', change: '-0.8%', good: true },
              { label: 'At-Risk Customers',  value: '312',  change: '+14',    good: false },
              { label: 'Recovered (30d)',    value: '89',   change: '+22',    good: true },
            ].map(({ label, value, change, good }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className={`text-3xl font-black ${good ? 'text-green-600' : 'text-red-500'}`}>{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className={`text-xs mt-0.5 font-semibold ${good ? 'text-green-500' : 'text-red-400'}`}>{change} vs last month</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">Churn Rate Trend</h2>
            <LineChart data={[6.8, 6.2, 5.9, 5.5, 5.1, 4.9, 4.7, 4.5, 4.4, 4.3, 4.2, 4.2]} color="#ef4444" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              {MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
              <FiAlertCircle className="text-amber-500" /> At-Risk Customers
            </h2>
            <div className="space-y-2">
              {[
                { name: 'Deepak R.', lastOrder: '47 days ago', orders: 8,  risk: 'High' },
                { name: 'Sunita B.', lastOrder: '38 days ago', orders: 12, risk: 'High' },
                { name: 'Arjun K.', lastOrder: '31 days ago', orders: 5,  risk: 'Medium' },
                { name: 'Puja L.',  lastOrder: '29 days ago', orders: 3,  risk: 'Medium' },
              ].map(({ name, lastOrder, orders, risk }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">Last order: {lastOrder} · {orders} total orders</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${risk === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{risk}</span>
                    <button className="text-xs text-violet-600 hover:underline">Send offer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Traffic ── */}
      {tab === 'traffic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sessions',    value: '85,400', change: '+12%' },
              { label: 'Pageviews',   value: '241,800', change: '+18%' },
              { label: 'Bounce Rate', value: '38.4%', change: '-2.1%' },
              { label: 'Avg Session', value: '4m 12s', change: '+0:28' },
            ].map(({ label, value, change }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-green-600 font-bold mt-1">{change}</p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">Top Pages</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b"><th className="pb-2 text-left">Page</th><th className="pb-2 text-right">Views</th><th className="pb-2 text-right">Bounce</th></tr></thead>
                <tbody>
                  {TRAFFIC_PAGES.map(({ page, views, bounce }) => (
                    <tr key={page} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-xs text-violet-700">{page}</td>
                      <td className="py-2 text-right font-semibold">{views.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-500">{bounce}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">Device Split</h2>
              <div className="space-y-3">
                {DEVICES.map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">{label}</span>
                      <span className="font-black text-gray-900">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-3">Traffic Sources</p>
                {[['Organic Search','44%'],['Direct','28%'],['Social','16%'],['Referral','12%']].map(([src,pct]) => (
                  <div key={src} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{src}</span><span className="font-bold text-gray-900">{pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Conversions ── */}
      {tab === 'conversions' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-black text-gray-900 mb-6">Conversion Funnel (Last 30 Days)</h2>
            <div className="space-y-3">
              {FUNNEL.map(({ label, value, pct }, i) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-bold text-gray-900">{label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">{value.toLocaleString()} users</span>
                      <span className="font-black text-violet-700 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, background: `rgba(124,58,237,${0.4 + i * 0.12})` }} />
                    {i > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        {Math.round((FUNNEL[i].value / FUNNEL[i-1].value) * 100)}% step conversion
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">Conversion Rate by Product Category</h2>
            <div className="space-y-2">
              {[
                ['Electronics',    '9.2%', 'bg-violet-500'],
                ['Fashion',        '7.8%', 'bg-indigo-500'],
                ['Home & Garden',  '6.4%', 'bg-blue-500'],
                ['Books',          '11.3%','bg-cyan-500'],
                ['Beauty',         '8.9%', 'bg-pink-500'],
              ].map(([cat, rate, color]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-700 font-medium">{cat}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className={`h-full ${color} rounded-lg`} style={{ width: `${(parseFloat(rate) / 12) * 100}%` }} />
                  </div>
                  <span className="font-black text-sm text-gray-900 w-12 text-right">{rate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Abandoned Carts ── */}
      {tab === 'abandoned' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Abandoned Carts',    value: '2,640', sub: 'Last 30 days' },
              { label: 'Abandonment Rate',   value: '64.1%', sub: 'Industry avg ~70%' },
              { label: 'Recoverable Value',  value: 'Rs.8.4L', sub: 'Estimated revenue' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-3xl font-black text-violet-700">{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900">Recent Abandoned Carts</h2>
              <button className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-bold transition-colors">
                Send Recovery Emails
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b"><th className="pb-2 text-left">Customer</th><th className="pb-2 text-right">Items</th><th className="pb-2 text-right">Value</th><th className="pb-2 text-right">Last Step</th><th className="pb-2 text-right">Ago</th><th className="pb-2 text-right">Action</th></tr></thead>
                <tbody>
                  {ABANDONED.map(({ user, email, items, value, lastSeen, step }) => (
                    <tr key={user} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3"><p className="font-semibold text-gray-900">{user}</p><p className="text-xs text-gray-400">{email}</p></td>
                      <td className="py-3 text-right">{items}</td>
                      <td className="py-3 text-right font-bold text-gray-900">Rs.{value.toLocaleString()}</td>
                      <td className="py-3 text-right"><span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">{step}</span></td>
                      <td className="py-3 text-right text-gray-500 text-xs">{lastSeen}</td>
                      <td className="py-3 text-right"><button className="text-xs text-violet-600 hover:underline font-semibold">Send email</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
