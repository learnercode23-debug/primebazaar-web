'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiAlertTriangle, FiShield, FiX, FiCheck, FiEye } from 'react-icons/fi'
import toast from 'react-hot-toast'

const FLAGS: Record<string, string> = {
  new_account:   '🆕 New account',
  high_value:    '💰 High value',
  addr_mismatch: '📍 Address mismatch',
  vpn:           '🌐 VPN/Proxy',
  multi_fail:    '❌ Multiple failed payments',
  rapid_orders:  '⚡ Rapid orders',
}

const MOCK: {
  id: string; customer: string; email: string; amount: number;
  risk: 'critical' | 'high' | 'medium'; flags: string[]; time: string; status: 'pending' | 'approved' | 'blocked'
}[] = [
  { id: 'PP-7831', customer: 'Unknown User', email: 'u***@gmail.com', amount: 84900, risk: 'critical', flags: ['new_account','high_value','vpn','multi_fail'], time: '12 min ago', status: 'pending' },
  { id: 'PP-7828', customer: 'Ramesh K.',   email: 'r***@yahoo.com', amount: 42000, risk: 'high',     flags: ['addr_mismatch','rapid_orders'],               time: '45 min ago', status: 'pending' },
  { id: 'PP-7820', customer: 'New User #4', email: 'n***@gmail.com', amount: 31500, risk: 'high',     flags: ['new_account','high_value'],                    time: '2h ago',     status: 'pending' },
  { id: 'PP-7805', customer: 'Sunita B.',   email: 's***@gmail.com', amount: 18200, risk: 'medium',   flags: ['multi_fail'],                                  time: '4h ago',     status: 'pending' },
  { id: 'PP-7799', customer: 'Dev P.',      email: 'd***@hotmail.com',amount: 9800, risk: 'medium',   flags: ['vpn'],                                         time: '6h ago',     status: 'approved' },
  { id: 'PP-7790', customer: 'Anon123',     email: 'a***@gmail.com', amount: 67400, risk: 'critical', flags: ['new_account','vpn','high_value','rapid_orders'], time: '8h ago',   status: 'blocked' },
]

const RISK_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
}
const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  blocked:  'bg-red-100 text-red-700',
}

export default function FraudDashboardPage() {
  const [orders, setOrders] = useState(MOCK)
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('all')

  function act(id: string, action: 'approved' | 'blocked') {
    setOrders(o => o.map(x => x.id === id ? { ...x, status: action } : x))
    toast.success(action === 'approved' ? `Order ${id} approved` : `Order ${id} blocked — customer notified`)
  }

  const shown = orders.filter(o =>
    filter === 'all' ? true :
    filter === 'pending' ? o.status === 'pending' :
    o.risk === 'critical'
  )

  const pending  = orders.filter(o => o.status === 'pending').length
  const critical = orders.filter(o => o.risk === 'critical').length
  const blocked  = orders.filter(o => o.status === 'blocked').length
  const savedAmt = orders.filter(o => o.status === 'blocked').reduce((s, o) => s + o.amount, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <FiAlertTriangle className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Fraud Detection</h1>
          <p className="text-sm text-gray-500">AI-flagged suspicious orders requiring review</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {pending} pending review
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Flagged (30d)',    value: orders.length,       color: 'text-amber-600' },
          { label: 'Critical Risk',    value: critical,            color: 'text-red-600' },
          { label: 'Blocked Orders',   value: blocked,             color: 'text-red-700' },
          { label: 'Amount Protected', value: `Rs.${(savedAmt/1000).toFixed(0)}K`, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all','pending','critical'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {shown.map(order => (
            <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono font-black text-sm text-gray-900">{order.id}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_COLORS[order.risk]}`}>
                      {order.risk.toUpperCase()} RISK
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{order.customer} <span className="text-gray-400 font-normal">({order.email})</span></p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">Rs.{order.amount.toLocaleString()}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {order.flags.map(flag => (
                      <span key={flag} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {FLAGS[flag]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{order.time}</p>
                </div>
                {order.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => act(order.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold transition-colors border border-green-200">
                      <FiCheck /> Approve
                    </button>
                    <button onClick={() => act(order.id, 'blocked')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors border border-red-200">
                      <FiX /> Block
                    </button>
                    <Link href={`/admin/orders`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                      <FiEye />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="py-12 text-center">
              <FiShield className="text-4xl text-green-400 mx-auto mb-3" />
              <p className="font-bold text-gray-900">All clear</p>
              <p className="text-sm text-gray-500">No orders matching this filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Common patterns */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-4">
        <h2 className="font-black text-gray-900 mb-3">Common Fraud Patterns (30 days)</h2>
        <div className="space-y-2">
          {[
            ['New account + high value order', 8, 'red'],
            ['VPN / Proxy detected',           6, 'orange'],
            ['Multiple failed payment attempts', 5, 'amber'],
            ['Address doesn\'t match billing',  4, 'yellow'],
            ['Rapid back-to-back orders',        3, 'amber'],
          ].map(([pattern, count, color]) => (
            <div key={pattern as string} className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-700">{pattern as string}</span>
              <span className={`text-xs font-black bg-${color as string}-100 text-${color as string}-700 px-2.5 py-1 rounded-full`}>{count as number} cases</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
