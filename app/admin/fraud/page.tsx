'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiAlertTriangle, FiShield, FiX, FiCheck, FiEye, FiCpu, FiActivity, FiSmartphone, FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface FraudOrder {
  id: string; customer: string; email: string; amount: number
  risk: 'critical' | 'high' | 'medium'; flags: string[]; time: string
  status: 'pending' | 'approved' | 'blocked'
  mlScore: number
  factors: { label: string; weight: number; signal: 'bad' | 'warn' | 'ok' }[]
  device: { fingerprint: string; browser: string; os: string; vpn: boolean }
  ip: { address: string; country: string; city: string; isp: string }
  velocity: { ordersLast1h: number; ordersLast24h: number; failedPayments: number }
  linkedAccounts: number
}

const MOCK: FraudOrder[] = [
  {
    id: 'PP-7831', customer: 'Unknown User', email: 'u***@gmail.com', amount: 84900,
    risk: 'critical', flags: ['new_account','high_value','vpn','multi_fail'], time: '12 min ago', status: 'pending',
    mlScore: 92,
    factors: [
      { label: 'New account (<24h)',    weight: 28, signal: 'bad' },
      { label: 'Order value > 3× avg', weight: 22, signal: 'bad' },
      { label: 'VPN/Proxy detected',   weight: 20, signal: 'bad' },
      { label: 'Payment failure ×3',   weight: 18, signal: 'bad' },
      { label: 'Shipping ≠ billing',   weight: 4,  signal: 'warn' },
    ],
    device: { fingerprint: 'fp_4a8b3c', browser: 'Chrome 124', os: 'Windows 11', vpn: true },
    ip: { address: '185.220.101.X', country: '🇷🇺 Russia', city: 'Moscow', isp: 'Mullvad VPN' },
    velocity: { ordersLast1h: 3, ordersLast24h: 7, failedPayments: 3 },
    linkedAccounts: 4,
  },
  {
    id: 'PP-7828', customer: 'Ramesh K.', email: 'r***@yahoo.com', amount: 42000,
    risk: 'high', flags: ['addr_mismatch','rapid_orders'], time: '45 min ago', status: 'pending',
    mlScore: 71,
    factors: [
      { label: 'Address mismatch',      weight: 32, signal: 'bad' },
      { label: 'Rapid order sequence',  weight: 24, signal: 'bad' },
      { label: 'Account age 14d',       weight: 15, signal: 'warn' },
    ],
    device: { fingerprint: 'fp_9d2e1f', browser: 'Safari 17', os: 'iOS 17', vpn: false },
    ip: { address: '27.34.88.X', country: '🇳🇵 Nepal', city: 'Kathmandu', isp: 'Nepal Telecom' },
    velocity: { ordersLast1h: 2, ordersLast24h: 5, failedPayments: 0 },
    linkedAccounts: 1,
  },
  {
    id: 'PP-7820', customer: 'New User #4', email: 'n***@gmail.com', amount: 31500,
    risk: 'high', flags: ['new_account','high_value'], time: '2h ago', status: 'pending',
    mlScore: 58,
    factors: [
      { label: 'New account (<48h)',    weight: 30, signal: 'bad' },
      { label: 'High value first order',weight: 28, signal: 'bad' },
    ],
    device: { fingerprint: 'fp_7f3a2b', browser: 'Firefox 125', os: 'Ubuntu 22', vpn: false },
    ip: { address: '103.69.X.X', country: '🇳🇵 Nepal', city: 'Lalitpur', isp: 'Vianet' },
    velocity: { ordersLast1h: 1, ordersLast24h: 1, failedPayments: 1 },
    linkedAccounts: 0,
  },
  {
    id: 'PP-7805', customer: 'Sunita B.', email: 's***@gmail.com', amount: 18200,
    risk: 'medium', flags: ['multi_fail'], time: '4h ago', status: 'pending',
    mlScore: 34,
    factors: [
      { label: 'Failed payment ×2',   weight: 34, signal: 'warn' },
      { label: 'Account age 90d',     weight: -10, signal: 'ok' },
      { label: '3 prev orders OK',    weight: -15, signal: 'ok' },
    ],
    device: { fingerprint: 'fp_2c8d4e', browser: 'Chrome 124', os: 'Android 14', vpn: false },
    ip: { address: '202.166.X.X', country: '🇳🇵 Nepal', city: 'Pokhara', isp: 'WorldLink' },
    velocity: { ordersLast1h: 0, ordersLast24h: 1, failedPayments: 2 },
    linkedAccounts: 0,
  },
  {
    id: 'PP-7790', customer: 'Anon123', email: 'a***@gmail.com', amount: 67400,
    risk: 'critical', flags: ['new_account','vpn','high_value','rapid_orders'], time: '8h ago', status: 'blocked',
    mlScore: 97,
    factors: [
      { label: 'New account (<6h)',    weight: 30, signal: 'bad' },
      { label: 'VPN/Tor detected',     weight: 25, signal: 'bad' },
      { label: 'Value 8× avg order',  weight: 22, signal: 'bad' },
      { label: '5 orders in 1 hour',  weight: 20, signal: 'bad' },
    ],
    device: { fingerprint: 'fp_SPOOFED', browser: 'Unknown', os: 'Unknown', vpn: true },
    ip: { address: '185.107.X.X', country: '🇩🇪 Germany (Tor)', city: 'Unknown', isp: 'Tor Exit Node' },
    velocity: { ordersLast1h: 5, ordersLast24h: 5, failedPayments: 0 },
    linkedAccounts: 8,
  },
]

const SIGNAL_COLORS = {
  bad:  'bg-red-100 text-red-700 border border-red-200',
  warn: 'bg-amber-100 text-amber-700 border border-amber-200',
  ok:   'bg-green-100 text-green-700 border border-green-200',
}

const RISK_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#ef4444' : score >= 50 ? '#f97316' : '#f59e0b'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-black" style={{ color }}>{score}</span>
    </div>
  )
}

function VelocityChart({ v }: { v: FraudOrder['velocity'] }) {
  const bars = [
    v.ordersLast1h * 4, v.ordersLast1h * 3.2, v.ordersLast1h * 2.8,
    v.ordersLast24h, v.ordersLast24h * 0.8, v.ordersLast24h * 0.6,
  ]
  const max = Math.max(...bars, 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 bg-violet-500 rounded-t opacity-70 transition-all hover:opacity-100"
          style={{ height: `${(b / max) * 100}%`, minHeight: 2 }} title={`${b} orders`} />
      ))}
    </div>
  )
}

export default function FraudDashboardPage() {
  const [orders, setOrders] = useState(MOCK)
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  function act(id: string, action: 'approved' | 'blocked') {
    setOrders(o => o.map(x => x.id === id ? { ...x, status: action } : x))
    toast.success(action === 'approved' ? `Order ${id} approved` : `Order ${id} blocked`)
  }

  const shown = orders.filter(o =>
    filter === 'all' ? true : filter === 'pending' ? o.status === 'pending' : o.risk === 'critical'
  )

  const pending  = orders.filter(o => o.status === 'pending').length
  const critical = orders.filter(o => o.risk === 'critical').length
  const blocked  = orders.filter(o => o.status === 'blocked').length
  const savedAmt = orders.filter(o => o.status === 'blocked').reduce((s, o) => s + o.amount, 0)
  const avgScore = Math.round(orders.reduce((s, o) => s + o.mlScore, 0) / orders.length)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <FiCpu className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">ML Fraud Detection</h1>
          <p className="text-sm text-gray-500">Real-time risk scoring · Velocity analysis · Device fingerprinting · Behavioral AI</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {pending} pending
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Flagged (30d)',     value: orders.length,       color: 'text-amber-600' },
          { label: 'Critical Risk',     value: critical,            color: 'text-red-600' },
          { label: 'Blocked Orders',    value: blocked,             color: 'text-red-700' },
          { label: 'Amount Protected',  value: `Rs.${(savedAmt/1000).toFixed(0)}K`, color: 'text-green-600' },
          { label: 'Avg ML Score',      value: `${avgScore}/100`,   color: avgScore > 60 ? 'text-red-600' : 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['all','pending','critical'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map(order => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-black text-sm text-gray-900">{order.id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_COLORS[order.risk]}`}>
                    {order.risk.toUpperCase()}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                    order.status === 'approved' ? 'bg-green-100 text-green-700' :
                    order.status === 'blocked'  ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{order.status}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{order.customer} <span className="text-gray-400 font-normal">({order.email})</span></p>
                <p className="text-sm font-black text-gray-900">Rs.{order.amount.toLocaleString()} · {order.time}</p>
              </div>

              {/* ML score */}
              <div className="w-36 flex-shrink-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <FiCpu className="text-violet-500" /> ML Risk Score
                </p>
                <ScoreBar score={order.mlScore} />
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => act(order.id, 'approved')}
                      className="flex items-center gap-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold border border-green-200">
                      <FiCheck /> Approve
                    </button>
                    <button onClick={() => act(order.id, 'blocked')}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200">
                      <FiX /> Block
                    </button>
                  </>
                )}
                <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">
                  <FiEye /> {expanded === order.id ? 'Less' : 'Details'}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === order.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Risk factors */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FiActivity className="text-red-500" /> Risk Factors
                  </p>
                  <div className="space-y-1.5">
                    {order.factors.map(f => (
                      <div key={f.label} className={`text-[11px] px-2 py-1.5 rounded-lg font-medium flex items-center justify-between ${SIGNAL_COLORS[f.signal]}`}>
                        <span>{f.label}</span>
                        <span className="font-black">{f.weight > 0 ? '+' : ''}{f.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device + IP */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FiSmartphone className="text-blue-500" /> Device & IP
                  </p>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between"><span className="text-gray-400">Fingerprint</span><span className="font-mono">{order.device.fingerprint}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Browser</span><span>{order.device.browser}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">OS</span><span>{order.device.os}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">VPN</span><span className={order.device.vpn ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {order.device.vpn ? '⚠ YES' : 'No'}
                    </span></div>
                    <hr className="my-1 border-gray-200" />
                    <div className="flex justify-between"><span className="text-gray-400">IP</span><span className="font-mono">{order.ip.address}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Location</span><span>{order.ip.city}, {order.ip.country}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">ISP</span><span className={order.ip.isp.includes('VPN') || order.ip.isp.includes('Tor') ? 'text-red-600 font-bold' : ''}>{order.ip.isp}</span></div>
                  </div>
                </div>

                {/* Velocity */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FiActivity className="text-orange-500" /> Order Velocity
                  </p>
                  <VelocityChart v={order.velocity} />
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last 1 hour</span>
                      <span className={`font-bold ${order.velocity.ordersLast1h >= 3 ? 'text-red-600' : 'text-gray-700'}`}>{order.velocity.ordersLast1h} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last 24 hours</span>
                      <span className={`font-bold ${order.velocity.ordersLast24h >= 5 ? 'text-red-600' : 'text-gray-700'}`}>{order.velocity.ordersLast24h} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Failed payments</span>
                      <span className={`font-bold ${order.velocity.failedPayments >= 2 ? 'text-red-600' : 'text-gray-700'}`}>{order.velocity.failedPayments}</span>
                    </div>
                  </div>
                </div>

                {/* Linked accounts */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FiMapPin className="text-purple-500" /> Network
                  </p>
                  <div className={`text-center py-4 rounded-xl border ${order.linkedAccounts > 2 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-3xl font-black ${order.linkedAccounts > 2 ? 'text-red-600' : 'text-gray-500'}`}>{order.linkedAccounts}</p>
                    <p className="text-xs text-gray-500 mt-1">Linked accounts<br />(same device/IP)</p>
                  </div>
                  {order.linkedAccounts > 2 && (
                    <p className="text-[11px] text-red-600 mt-2 font-semibold">⚠ Multiple accounts sharing this device — possible account farming.</p>
                  )}
                  <div className="mt-3 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700 mb-1">AI Recommendation:</p>
                    <p>{order.mlScore >= 80 ? '🚫 Block immediately. High confidence fraud pattern.' :
                       order.mlScore >= 50 ? '⚠ Manual review required before shipping.' :
                       '✓ Low risk. Approve with standard monitoring.'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fraud patterns */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-4">
        <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2"><FiShield className="text-violet-500" /> ML Model — Top Fraud Signals (30d)</h2>
        <div className="space-y-2">
          {[
            { pattern: 'New account + high-value first order', impact: 28, cases: 8 },
            { pattern: 'VPN / Tor exit node IP',              impact: 25, cases: 6 },
            { pattern: '3+ failed payments same session',     impact: 18, cases: 5 },
            { pattern: 'Shipping country ≠ IP country',       impact: 15, cases: 4 },
            { pattern: '5+ orders within 1 hour',             impact: 20, cases: 3 },
          ].map(({ pattern, impact, cases }) => (
            <div key={pattern} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
              <div className="flex-1">
                <p className="text-sm text-gray-700">{pattern}</p>
                <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${impact * 3}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-red-600">+{impact}pts</p>
                <p className="text-[10px] text-gray-400">{cases} cases</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
