'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiShield, FiX, FiCheck, FiEye, FiCpu, FiActivity, FiUser, FiMapPin } from 'react-icons/fi'

interface Factor { label: string; weight: number; signal: 'bad' | 'warn' | 'ok' }
interface FraudOrder {
  id: string; customer: string; email: string; amount: number; time: string
  paymentMethod: string; accountAgeDays: number | null; ordersOnRecord: number; city: string
  risk: 'critical' | 'high' | 'medium'; status: 'pending' | 'approved' | 'blocked'
  mlScore: number; factors: Factor[]
  velocity: { ordersLast1h: number; ordersLast24h: number; failedPayments: number }
  linkedAccounts: number
}

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

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function FraudDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<FraudOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/admin/fraud')
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  async function act(id: string, status: 'approved' | 'blocked') {
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
    try {
      await axios.patch('/api/admin/fraud', { id, status })
      toast.success(status === 'approved' ? 'Order approved' : 'Order blocked')
    } catch { toast.error('Action failed') }
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  const shown = orders.filter(o =>
    filter === 'all' ? true : filter === 'pending' ? o.status === 'pending' : o.risk === 'critical'
  )
  const pending  = orders.filter(o => o.status === 'pending').length
  const critical = orders.filter(o => o.risk === 'critical').length
  const blocked  = orders.filter(o => o.status === 'blocked').length
  const savedAmt = orders.filter(o => o.status === 'blocked').reduce((s, o) => s + o.amount, 0)
  const avgScore = orders.length ? Math.round(orders.reduce((s, o) => s + o.mlScore, 0) / orders.length) : 0

  // Top signals derived from the real flagged orders
  const signalDefs: { key: string; label: string; match: (f: Factor) => boolean }[] = [
    { key: 'new', label: 'New account + recent order', match: f => f.label.startsWith('New account') },
    { key: 'value', label: 'Order value well above average', match: f => f.label.includes('value') },
    { key: 'velocity', label: 'Rapid order velocity', match: f => f.label.includes('orders in') },
    { key: 'failed', label: 'Unpaid / failed orders', match: f => f.label.includes('unpaid/failed') },
    { key: 'linked', label: 'Accounts sharing a phone', match: f => f.label.includes('phone') || f.label.includes('linked') },
  ]
  const topSignals = signalDefs
    .map(s => ({ label: s.label, cases: orders.filter(o => o.factors.some(s.match)).length }))
    .filter(s => s.cases > 0)
    .sort((a, b) => b.cases - a.cases)

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
          <h1 className="text-xl font-black text-gray-900">Fraud Detection</h1>
          <p className="text-sm text-gray-500">Risk scoring from account age, order value, velocity, failed payments &amp; linked accounts</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {pending} pending
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Flagged (30d)',    value: orders.length,       color: 'text-amber-600' },
          { label: 'Critical Risk',    value: critical,            color: 'text-red-600' },
          { label: 'Blocked Orders',   value: blocked,             color: 'text-red-700' },
          { label: 'Amount Protected', value: `Rs.${(savedAmt / 1000).toFixed(0)}K`, color: 'text-green-600' },
          { label: 'Avg Risk Score',   value: `${avgScore}/100`,   color: avgScore > 60 ? 'text-red-600' : 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-2xl">
          <FiShield className="text-5xl mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No flagged orders</p>
          <p className="text-sm mt-1">Orders from the last 30 days with a risk score of 25+ appear here.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {(['all', 'pending', 'critical'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {shown.map(order => (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-black text-sm text-gray-900">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_COLORS[order.risk]}`}>{order.risk.toUpperCase()}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                        order.status === 'approved' ? 'bg-green-100 text-green-700' :
                        order.status === 'blocked'  ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{order.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{order.customer} <span className="text-gray-400 font-normal">({order.email})</span></p>
                    <p className="text-sm font-black text-gray-900">Rs.{order.amount.toLocaleString()} · {timeAgo(order.time)}</p>
                  </div>

                  <div className="w-36 flex-shrink-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <FiCpu className="text-violet-500" /> Risk Score
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

                {expanded === order.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Risk factors */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FiActivity className="text-red-500" /> Risk Factors
                      </p>
                      <div className="space-y-1.5">
                        {order.factors.length === 0 && <p className="text-xs text-gray-400">No individual factors.</p>}
                        {order.factors.map(f => (
                          <div key={f.label} className={`text-[11px] px-2 py-1.5 rounded-lg font-medium flex items-center justify-between ${SIGNAL_COLORS[f.signal]}`}>
                            <span>{f.label}</span>
                            <span className="font-black">{f.weight > 0 ? '+' : ''}{f.weight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Account + order */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FiUser className="text-blue-500" /> Account &amp; Order
                      </p>
                      <div className="space-y-1 text-xs text-gray-700">
                        <div className="flex justify-between"><span className="text-gray-400">Account age</span><span className={order.accountAgeDays != null && order.accountAgeDays <= 2 ? 'text-red-600 font-bold' : ''}>{order.accountAgeDays != null ? `${order.accountAgeDays} days` : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Orders on record</span><span>{order.ordersOnRecord}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className="capitalize">{order.paymentMethod}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Ship to</span><span>{order.city}</span></div>
                        <hr className="my-1 border-gray-200" />
                        <div className="flex justify-between"><span className="text-gray-400">Orders last 1h</span><span className={order.velocity.ordersLast1h >= 3 ? 'text-red-600 font-bold' : ''}>{order.velocity.ordersLast1h}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Orders last 24h</span><span className={order.velocity.ordersLast24h >= 5 ? 'text-red-600 font-bold' : ''}>{order.velocity.ordersLast24h}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Failed payments</span><span className={order.velocity.failedPayments >= 2 ? 'text-red-600 font-bold' : ''}>{order.velocity.failedPayments}</span></div>
                      </div>
                    </div>

                    {/* Network */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FiMapPin className="text-purple-500" /> Network
                      </p>
                      <div className={`text-center py-4 rounded-xl border ${order.linkedAccounts > 2 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <p className={`text-3xl font-black ${order.linkedAccounts > 2 ? 'text-red-600' : 'text-gray-500'}`}>{order.linkedAccounts}</p>
                        <p className="text-xs text-gray-500 mt-1">Linked accounts<br />(same phone number)</p>
                      </div>
                      <div className="mt-3 text-xs text-gray-600">
                        <p className="font-semibold text-gray-700 mb-1">Recommendation:</p>
                        <p>{order.mlScore >= 80 ? '🚫 Block — high-confidence fraud pattern.' :
                           order.mlScore >= 50 ? '⚠ Manual review before shipping.' :
                           '✓ Lower risk — approve with monitoring.'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {topSignals.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-4">
              <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2"><FiShield className="text-violet-500" /> Top Fraud Signals (30d)</h2>
              <div className="space-y-2">
                {topSignals.map(({ label, cases }) => (
                  <div key={label} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{label}</p>
                      <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (cases / orders.length) * 100)}%` }} />
                      </div>
                    </div>
                    <p className="text-xs font-black text-gray-500 flex-shrink-0">{cases} case{cases === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
