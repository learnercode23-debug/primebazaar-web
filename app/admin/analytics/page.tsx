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
    { key: 'forecast',     label: '🔮 Demand Forecast' },
  ]

const FORECAST_DATA = {
  categories: ['Electronics', 'Fashion', 'Home & Garden', 'Books', 'Sports', 'Beauty'],
  nextMonthDemand: [+18, +12, +8, -3, +22, +15],
  predicted:    [320000, 290000, 310000, 280000, 340000, 370000, 350000, 390000, 410000, 430000, 450000, 480000],
  actual:       [298000, 278000, 305000, 271000, 325000, 360000, 345000, 385000, 402000, 421000, null, null],
  topProducts:  [
    { title: 'Samsung Galaxy A35', category: 'Electronics', forecastSales: 148, trend: '+32%', confidence: 91 },
    { title: 'Nike Running Shoes', category: 'Fashion',     forecastSales: 94,  trend: '+18%', confidence: 86 },
    { title: 'Air Purifier HEPA',  category: 'Home',        forecastSales: 67,  trend: '+41%', confidence: 78 },
    { title: 'JBL Earbuds Pro',    category: 'Electronics', forecastSales: 112, trend: '+25%', confidence: 88 },
    { title: 'Yoga Mat Premium',   category: 'Sports',      forecastSales: 83,  trend: '+55%', confidence: 82 },
  ],
}

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

      {/* ── Churn (ML) ── */}
      {tab === 'churn' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Churn Rate',  value: '4.2%',    change: '-0.8%', good: true },
              { label: 'At-Risk Customers',   value: '312',     change: '+14',   good: false },
              { label: 'Revenue at Risk',      value: 'Rs.1.2L', change: '+18%',  good: false },
              { label: 'Recovered (30d)',      value: '89',      change: '+22',   good: true },
            ].map(({ label, value, change, good }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className={`text-3xl font-black ${good ? 'text-green-600' : 'text-red-500'}`}>{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className={`text-xs mt-0.5 font-semibold ${good ? 'text-green-500' : 'text-red-400'}`}>{change} vs last month</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">Churn Rate Trend (ML Predicted)</h2>
            <LineChart data={[6.8, 6.2, 5.9, 5.5, 5.1, 4.9, 4.7, 4.5, 4.4, 4.3, 4.2, 4.2]} color="#ef4444" />
            <LineChart data={[7.1, 6.5, 6.1, 5.7, 5.3, 5.0, 4.9, 4.6, 4.5, 4.4, 4.3, 4.0]} color="#f97316" height={60} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              {MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-red-500" /> Actual churn</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-orange-400" style={{ borderTop: '1px dashed' }} /> ML forecast</span>
            </div>
          </div>

          {/* ML at-risk table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-gray-900 flex items-center gap-2">
                <FiAlertCircle className="text-red-500" /> ML At-Risk Customer Predictions
              </h2>
              <button className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-xl font-bold">
                Export List
              </button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="px-4 py-2.5 text-left">Customer</th>
                <th className="px-4 py-2.5 text-right">Churn Prob.</th>
                <th className="px-4 py-2.5 text-right">LTV</th>
                <th className="px-4 py-2.5 text-right">Last Order</th>
                <th className="px-4 py-2.5 text-right">Pred. Churn</th>
                <th className="px-4 py-2.5 text-right">Top Signal</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'Deepak R.', prob: 91, ltv: 'Rs.41,200', lastOrder: '47d ago', churnIn: '~3d',  signal: '47d no purchase', action: '🚨 Urgent outreach' },
                  { name: 'Sunita B.', prob: 83, ltv: 'Rs.28,600', lastOrder: '38d ago', churnIn: '~8d',  signal: 'Category shift',  action: '🎁 Send 20% coupon' },
                  { name: 'Arjun K.',  prob: 74, ltv: 'Rs.19,400', lastOrder: '31d ago', churnIn: '~14d', signal: 'Fewer sessions',   action: '📧 Re-engage email' },
                  { name: 'Puja L.',   prob: 68, ltv: 'Rs.14,800', lastOrder: '29d ago', churnIn: '~18d', signal: 'Cart abandon ×3',  action: '💬 Reminder push' },
                  { name: 'Ram S.',    prob: 61, ltv: 'Rs.32,100', lastOrder: '25d ago', churnIn: '~22d', signal: 'Price sensitivity', action: '🎁 Loyalty reward' },
                  { name: 'Gita P.',   prob: 54, ltv: 'Rs.8,700',  lastOrder: '22d ago', churnIn: '~28d', signal: 'Low engagement',   action: '📧 Newsletter' },
                  { name: 'Bikash T.', prob: 47, ltv: 'Rs.61,400', lastOrder: '19d ago', churnIn: '~35d', signal: 'Slowing orders',   action: '👑 VIP offer' },
                ].map(({ name, prob, ltv, lastOrder, churnIn, signal, action }) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-black text-violet-700">{name[0]}</div>
                        <span className="font-semibold text-gray-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${prob}%`, backgroundColor: prob >= 80 ? '#ef4444' : prob >= 60 ? '#f97316' : '#f59e0b' }} />
                        </div>
                        <span className={`font-black text-xs ${prob >= 80 ? 'text-red-600' : prob >= 60 ? 'text-orange-600' : 'text-amber-600'}`}>{prob}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{ltv}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{lastOrder}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold text-xs ${prob >= 80 ? 'text-red-600' : 'text-amber-600'}`}>{churnIn}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">{signal}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-xs font-semibold text-violet-600 hover:text-violet-800 hover:underline whitespace-nowrap">{action}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Intervention playbooks */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '🚨', tier: 'Critical (>80%)', color: 'border-red-200 bg-red-50', actions: ['Personal phone call', 'Exclusive 30% discount', 'Free delivery for 3 months', 'Dedicated account manager'] },
              { icon: '⚠️', tier: 'High Risk (60-80%)', color: 'border-orange-200 bg-orange-50', actions: ['Personalized email', '20% coupon code', 'Win-back campaign', 'Product recommendation'] },
              { icon: '💡', tier: 'Watch (40-60%)', color: 'border-amber-200 bg-amber-50', actions: ['Newsletter engagement', 'Loyalty points bonus', 'Browse reminder push', 'Seasonal campaign'] },
            ].map(({ icon, tier, color, actions }) => (
              <div key={tier} className={`border rounded-2xl p-4 ${color}`}>
                <p className="font-bold text-gray-900 text-sm mb-2">{icon} {tier}</p>
                <ul className="space-y-1">
                  {actions.map(a => <li key={a} className="text-xs text-gray-700 flex items-center gap-1.5"><span className="text-gray-400">→</span>{a}</li>)}
                </ul>
              </div>
            ))}
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

      {/* ── Demand Forecast ── */}
      {tab === 'forecast' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Projected Next Month Revenue', value: 'Rs.5,20,000', change: '+15.6%', up: true },
              { label: 'Projected Orders', value: '920', change: '+18%', up: true },
              { label: 'Forecast Accuracy (30d)',   value: '87.4%', change: '+2.1%', up: true },
            ].map(({ label, value, change, up }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className={`text-3xl font-black ${up ? 'text-green-600' : 'text-red-500'}`}>{value}</p>
                <p className="font-bold text-gray-900 text-sm mt-1">{label}</p>
                <p className={`text-xs font-semibold mt-0.5 ${up ? 'text-green-500' : 'text-red-400'}`}>{change} predicted</p>
              </div>
            ))}
          </div>

          {/* Predicted vs Actual chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-1">Revenue — Predicted vs Actual (Rs.)</h2>
            <p className="text-xs text-gray-500 mb-4">Grey = predicted · Violet = actual · Last 2 months = forecast only</p>
            <div className="relative h-36">
              <svg viewBox={`0 0 ${12 * 30} 120`} className="w-full h-full" preserveAspectRatio="none">
                {FORECAST_DATA.predicted.map((v, i) => {
                  const maxV = Math.max(...FORECAST_DATA.predicted)
                  const barH = (v / maxV) * 96
                  const isForecastOnly = i >= 10
                  return (
                    <rect key={i} x={i * 30 + 4} y={112 - barH} width={22} height={barH} rx="3"
                      fill={isForecastOnly ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)'}
                      stroke={isForecastOnly ? 'rgba(124,58,237,0.5)' : 'none'}
                      strokeWidth={isForecastOnly ? '1' : '0'}
                      strokeDasharray={isForecastOnly ? '3,2' : '0'}
                    />
                  )
                })}
                {(() => {
                  const maxV = Math.max(...FORECAST_DATA.predicted)
                  const actualPts = FORECAST_DATA.actual
                    .map((v, i) => v !== null ? `${i * 30 + 15},${112 - ((v / maxV) * 96)}` : null)
                    .filter(Boolean)
                  return <polyline points={actualPts.join(' ')} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                })()}
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              {MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          {/* Category demand heatmap */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">Next Month Demand by Category</h2>
            <div className="space-y-3">
              {FORECAST_DATA.categories.map((cat, i) => {
                const change = FORECAST_DATA.nextMonthDemand[i]
                const isUp = change >= 0
                return (
                  <div key={cat} className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-gray-900 w-36 flex-shrink-0">{cat}</p>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.min(Math.abs(change) * 3, 100)}%`, background: isUp ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)' }}>
                        <span className="text-[10px] font-black text-white">{isUp ? '+' : ''}{change}%</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black w-16 text-right ${isUp ? 'text-green-600' : 'text-red-500'}`}>{isUp ? '▲' : '▼'} {Math.abs(change)}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top forecasted products */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-black text-gray-900 mb-4">Top Forecasted Products — Next 30 Days</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b pb-2">
                <th className="pb-3 text-left">Product</th>
                <th className="pb-3 text-left">Category</th>
                <th className="pb-3 text-right">Forecast Sales</th>
                <th className="pb-3 text-right">Trend</th>
                <th className="pb-3 text-right">Confidence</th>
              </tr></thead>
              <tbody>
                {FORECAST_DATA.topProducts.map(p => (
                  <tr key={p.title} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{p.title}</td>
                    <td className="py-2.5 text-gray-500">{p.category}</td>
                    <td className="py-2.5 text-right font-bold">{p.forecastSales} units</td>
                    <td className="py-2.5 text-right text-green-600 font-bold">{p.trend}</td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.confidence >= 90 ? 'bg-green-100 text-green-700' : p.confidence >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{p.confidence}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
