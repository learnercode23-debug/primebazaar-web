'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  FiRefreshCw, FiFilter, FiUser, FiPackage,
  FiChevronLeft, FiChevronRight, FiEdit2, FiList,
  FiX, FiCheck, FiSettings
} from 'react-icons/fi'

/* ── Types ── */
interface SubOrderItem { title: string; quantity: number; price: number }
interface Seller       { _id: string; name: string; email: string }
interface SubOrder {
  _id: string
  subOrderNumber: string
  status: string
  assignmentRule: string
  assignmentReason: string
  subtotal: number
  totalAmount: number
  createdAt: string
  seller: Seller
  parentOrder: {
    _id: string
    orderNumber: string
    user: { name: string; email: string }
    shippingAddress: { city: string; country: string }
  }
  items: SubOrderItem[]
}
interface AssignmentLog {
  _id: string
  action: string
  fromSeller: { name: string } | null
  toSeller:   { name: string }
  rule:       string
  reason:     string
  performedBy:{ name: string } | null
  timestamp:  string
}

/* ── Status badge colours ── */
const STATUS_COLOR: Record<string, string> = {
  confirmed:       'bg-blue-100 text-blue-700',
  processing:      'bg-yellow-100 text-yellow-700',
  packed:          'bg-purple-100 text-purple-700',
  shipped:         'bg-indigo-100 text-indigo-700',
  out_for_delivery:'bg-orange-100 text-orange-700',
  delivered:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-700',
  returned:        'bg-gray-100 text-gray-700',
}

/* ── Rule badge colours ── */
const RULE_COLOR: Record<string, string> = {
  lowest_price:   'bg-green-50 text-green-700 border border-green-200',
  highest_rating: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  round_robin:    'bg-blue-50 text-blue-700 border border-blue-200',
  nearest:        'bg-purple-50 text-purple-700 border border-purple-200',
  manual:         'bg-red-50 text-red-700 border border-red-200',
  auto_only_one:  'bg-gray-50 text-gray-600 border border-gray-200',
  primary_seller: 'bg-gray-50 text-gray-600 border border-gray-200',
}

const RULE_LABELS: Record<string, string> = {
  lowest_price:   'Lowest Price',
  highest_rating: 'Highest Rating',
  round_robin:    'Round-Robin',
  nearest:        'Nearest',
  manual:         'Manual',
  auto_only_one:  'Auto (sole supplier)',
  primary_seller: 'Primary Seller',
}

const ALL_RULES = [
  { value: 'lowest_price',   label: 'Lowest Price',   description: 'Assign to seller offering cheapest price' },
  { value: 'highest_rating', label: 'Highest Rating',  description: 'Assign to seller with best avg product rating' },
  { value: 'round_robin',    label: 'Round-Robin',     description: 'Rotate assignments fairly among eligible sellers' },
  { value: 'nearest',        label: 'Nearest Seller',  description: 'Assign to geographically closest seller (GPS coming soon)' },
]

export default function AssignmentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  /* ── Data state ── */
  const [subOrders,   setSubOrders]   = useState<SubOrder[]>([])
  const [sellers,     setSellers]     = useState<Seller[]>([])
  const [activeRule,  setActiveRule]  = useState('lowest_price')
  const [loading,     setLoading]     = useState(true)
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const LIMIT = 15

  /* ── Filters ── */
  const [filterSeller, setFilterSeller] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  /* ── Reassign modal ── */
  const [reassignTarget,   setReassignTarget]   = useState<SubOrder | null>(null)
  const [reassignSellerId, setReassignSellerId] = useState('')
  const [reassignReason,   setReassignReason]   = useState('')
  const [reassigning,      setReassigning]       = useState(false)

  /* ── Logs modal ── */
  const [logsTarget, setLogsTarget] = useState<SubOrder | null>(null)
  const [logs,       setLogs]       = useState<AssignmentLog[]>([])
  const [logsLoading,setLogsLoading]= useState(false)

  /* ── Config panel ── */
  const [showConfig,   setShowConfig]   = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  /* ── Auth guard ── */
  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  /* ── Fetch data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
      })
      if (filterSeller) params.set('seller', filterSeller)
      if (filterStatus) params.set('status', filterStatus)
      if (filterFrom)   params.set('from',   filterFrom)
      if (filterTo)     params.set('to',     filterTo)

      const [ordersRes, sellersRes, configRes] = await Promise.all([
        axios.get(`/api/admin/assignments?${params}`),
        axios.get('/api/admin/sellers'),
        axios.get('/api/admin/assignment-config'),
      ])

      setSubOrders(ordersRes.data.data || [])
      setTotal(ordersRes.data.total || 0)
      setSellers(sellersRes.data.data || [])
      setActiveRule(configRes.data.data?.rule || 'lowest_price')
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [page, filterSeller, filterStatus, filterFrom, filterTo])

  useEffect(() => { if (user?.role === 'admin') fetchAll() }, [fetchAll, user])

  /* ── Save config ── */
  async function saveRule(rule: string) {
    setSavingConfig(true)
    try {
      await axios.put('/api/admin/assignment-config', { rule })
      setActiveRule(rule)
      toast.success('Assignment rule updated')
    } catch {
      toast.error('Failed to save rule')
    } finally {
      setSavingConfig(false)
    }
  }

  /* ── Reassign ── */
  async function handleReassign() {
    if (!reassignTarget || !reassignSellerId) return
    setReassigning(true)
    try {
      await axios.post(`/api/admin/assignments/${reassignTarget._id}/reassign`, {
        newSellerId: reassignSellerId,
        reason:      reassignReason,
      })
      toast.success('Order reassigned successfully')
      setReassignTarget(null)
      setReassignSellerId('')
      setReassignReason('')
      fetchAll()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Reassign failed'
      toast.error(msg)
    } finally {
      setReassigning(false)
    }
  }

  /* ── Load logs ── */
  async function openLogs(sub: SubOrder) {
    setLogsTarget(sub)
    setLogsLoading(true)
    try {
      const res = await axios.get(`/api/admin/assignments/${sub._id}/logs`)
      setLogs(res.data.data || [])
    } catch {
      toast.error('Failed to load logs')
    } finally {
      setLogsLoading(false)
    }
  }

  /* ── Seed helper ── */
  async function handleSeed() {
    try {
      const res = await axios.post('/api/seed/assignments')
      toast.success(res.data.message)
      fetchAll()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Seed failed')
    }
  }

  if (authLoading || !user) return null

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Seller Assignment Dashboard</h1>
            <p className="text-xs text-gray-500">{total} sub-orders total</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
            >
              <FiSettings className="text-sm" /> Rule Config
            </button>
            <button
              onClick={handleSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Seed Demo Data
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              <FiRefreshCw className="text-sm" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* ── Config Panel ── */}
        {showConfig && (
          <div className="bg-white rounded-xl border border-indigo-200 p-5">
            <h2 className="font-bold text-gray-900 mb-1">Assignment Rule</h2>
            <p className="text-sm text-gray-500 mb-4">
              Applied when multiple sellers stock the same product.
              Active rule: <strong>{RULE_LABELS[activeRule]}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ALL_RULES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => saveRule(r.value)}
                  disabled={savingConfig}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    activeRule === r.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
                >
                  {activeRule === r.value && (
                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full mb-2">
                      <FiCheck className="text-xs" /> Active
                    </span>
                  )}
                  <p className="font-semibold text-sm text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              value={filterSeller}
              onChange={(e) => { setFilterSeller(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sellers</option>
              {sellers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {['confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterFrom}
              onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="From date"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => { setFilterTo(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="To date"
            />
          </div>
          {(filterSeller || filterStatus || filterFrom || filterTo) && (
            <button
              onClick={() => { setFilterSeller(''); setFilterStatus(''); setFilterFrom(''); setFilterTo(''); setPage(1) }}
              className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <FiX /> Clear filters
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : subOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FiPackage className="text-4xl mx-auto mb-2" />
              <p className="font-medium">No sub-orders found</p>
              <p className="text-sm mt-1">Try clicking &quot;Seed Demo Data&quot; then place a test order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Sub-Order</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Products</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned Seller</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Rule / Reason</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subOrders.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      {/* Sub-order ID */}
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-bold text-gray-900">{sub.subOrderNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                        {sub.parentOrder && (
                          <p className="text-xs text-indigo-600 mt-0.5">#{sub.parentOrder.orderNumber}</p>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        {sub.parentOrder?.user ? (
                          <>
                            <p className="font-medium text-gray-900 text-xs">{sub.parentOrder.user.name}</p>
                            <p className="text-xs text-gray-400">{sub.parentOrder.user.email}</p>
                            {sub.parentOrder.shippingAddress && (
                              <p className="text-xs text-gray-400">
                                {sub.parentOrder.shippingAddress.city}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Products */}
                      <td className="px-4 py-3">
                        <ul className="space-y-0.5">
                          {sub.items.slice(0, 2).map((item, i) => (
                            <li key={i} className="text-xs text-gray-700 truncate max-w-[160px]">
                              {item.quantity}× {item.title}
                            </li>
                          ))}
                          {sub.items.length > 2 && (
                            <li className="text-xs text-gray-400">+{sub.items.length - 2} more</li>
                          )}
                        </ul>
                      </td>

                      {/* Assigned seller */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {sub.seller?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{sub.seller?.name}</p>
                            <p className="text-xs text-gray-400">{sub.seller?.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rule & Reason */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${RULE_COLOR[sub.assignmentRule] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                          {RULE_LABELS[sub.assignmentRule] || sub.assignmentRule}
                        </span>
                        <p className="text-xs text-gray-500 mt-1 leading-tight line-clamp-2">
                          {sub.assignmentReason}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                          {sub.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-900">
                          Rs.{sub.totalAmount.toLocaleString()}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => { setReassignTarget(sub); setReassignSellerId('') }}
                            disabled={['delivered','cancelled','returned'].includes(sub.status)}
                            className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <FiEdit2 className="text-xs" /> Reassign
                          </button>
                          <button
                            onClick={() => openLogs(sub)}
                            className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100"
                          >
                            <FiList className="text-xs" /> History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  <FiChevronLeft className="text-sm" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
                >
                  <FiChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ Reassign Modal ════════ */}
      {reassignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Reassign Sub-Order</h2>
              <button onClick={() => setReassignTarget(null)} className="text-gray-400 hover:text-gray-600">
                <FiX />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-medium text-gray-900">{reassignTarget.subOrderNumber}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Currently: <strong>{reassignTarget.seller?.name}</strong>
              </p>
              <p className="text-gray-500 text-xs">
                Items: {reassignTarget.items.map((i) => i.title).join(', ')}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Seller</label>
                <select
                  value={reassignSellerId}
                  onChange={(e) => setReassignSellerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a seller…</option>
                  {sellers
                    .filter((s) => s._id !== reassignTarget.seller?._id)
                    .map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Original seller ran out of stock"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setReassignTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={!reassignSellerId || reassigning}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                {reassigning ? 'Reassigning…' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Assignment History Modal ════════ */}
      {logsTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Assignment History</h2>
                <p className="text-xs text-gray-500">{logsTarget.subOrderNumber}</p>
              </div>
              <button onClick={() => setLogsTarget(null)} className="text-gray-400 hover:text-gray-600">
                <FiX />
              </button>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No assignment logs yet</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                {logs.map((log, i) => (
                  <li key={log._id || i} className="ml-4">
                    <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${
                      log.action === 'manual_reassigned' ? 'bg-orange-500' : 'bg-indigo-500'
                    }`} />
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          log.action === 'manual_reassigned'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {log.action === 'manual_reassigned' ? 'Manual Reassign' : 'Auto Assigned'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.fromSeller && (
                        <p className="text-xs text-gray-600">
                          <span className="text-gray-400">From:</span> {log.fromSeller.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">
                        <span className="text-gray-400">To:</span> <strong>{log.toSeller?.name}</strong>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{log.reason}</p>
                      {log.performedBy && (
                        <p className="text-xs text-gray-400 mt-1">By admin: {log.performedBy.name}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
