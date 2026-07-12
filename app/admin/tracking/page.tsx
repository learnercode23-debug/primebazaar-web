'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  FiRefreshCw, FiFilter, FiSearch, FiAlertTriangle,
  FiClock, FiX, FiEdit2, FiTrash2, FiList,
  FiChevronLeft, FiChevronRight, FiTrendingUp,
  FiSettings, FiZap, FiCheck, FiPackage
} from 'react-icons/fi'

/* ─── Types ──────────────────────────────────────────────── */
interface SubOrder {
  _id: string
  subOrderNumber: string
  status: string
  assignmentRule: string
  assignmentReason: string
  slaStatus: string
  acceptDeadline?: string
  shipDeadline?: string
  autoActionTaken: boolean
  autoActionType?: string
  subtotal: number
  totalAmount: number
  createdAt: string
  seller: { _id: string; name: string; email: string }
  parentOrder: {
    _id: string; orderNumber: string
    user: { name: string; email: string }
    shippingAddress: { city: string }
  }
  items: Array<{ title: string; quantity: number; price: number }>
}
interface Seller { _id: string; name: string; email: string }
interface Performance {
  seller: string; sellerName: string; sellerEmail: string
  totalAssigned: number; acceptedOnTime: number; shippedOnTime: number
  cancelled: number; delivered: number
  acceptanceRate: number; onTimeShipRate: number; cancellationRate: number; overallScore: number
}
interface SLACfg {
  acceptHours: number; shipDays: number
  onAcceptBreach: string; onShipBreach: string; notifyAdmin: boolean
}
interface AssignmentLog {
  _id: string; action: string
  fromSeller: { name: string } | null; toSeller: { name: string }
  rule: string; reason: string
  performedBy: { name: string } | null; timestamp: string
}

/* ─── Helpers ────────────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  confirmed:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700',
  packed:'bg-purple-100 text-purple-700', shipped:'bg-indigo-100 text-indigo-700',
  out_for_delivery:'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700',
  cancelled:'bg-red-100 text-red-700', returned:'bg-gray-100 text-gray-600',
}

function formatMs(ms: number): string {
  if (ms < 0) return 'Overdue'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`
  if (h > 0)   return `${h}h ${m}m`
  return `${m}m`
}

function SLABadge({ sub }: { sub: SubOrder }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x+1), 60000); return () => clearInterval(t) }, [])
  void tick

  const now = Date.now()
  const isFinal = ['delivered','cancelled','returned'].includes(sub.status)
  if (isFinal) return <span className="text-xs text-gray-400">—</span>

  if (sub.status === 'confirmed' && sub.acceptDeadline) {
    const ms = new Date(sub.acceptDeadline).getTime() - now
    if (ms < 0) return <span className="flex items-center gap-1 text-xs font-bold text-red-600"><FiAlertTriangle className="text-xs"/>Accept breached</span>
    if (ms < 3600000) return <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><FiClock className="text-xs"/>Accept in {formatMs(ms)}</span>
    return <span className="flex items-center gap-1 text-xs text-green-600"><FiCheck className="text-xs"/>Accept in {formatMs(ms)}</span>
  }

  if (['confirmed','processing','packed'].includes(sub.status) && sub.shipDeadline) {
    const ms = new Date(sub.shipDeadline).getTime() - now
    if (ms < 0) return <span className="flex items-center gap-1 text-xs font-bold text-red-600"><FiAlertTriangle className="text-xs"/>Ship breached</span>
    if (ms < 86400000) return <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><FiClock className="text-xs"/>Ship in {formatMs(ms)}</span>
    return <span className="flex items-center gap-1 text-xs text-green-600"><FiCheck className="text-xs"/>Ship in {formatMs(ms)}</span>
  }
  return <span className="text-xs text-gray-400">On track</span>
}

function rowUrgency(sub: SubOrder): string {
  if (['delivered','cancelled','returned'].includes(sub.status)) return ''
  const now = Date.now()
  if (sub.acceptDeadline && new Date(sub.acceptDeadline).getTime() < now) return 'bg-red-50'
  if (sub.shipDeadline   && new Date(sub.shipDeadline).getTime()   < now) return 'bg-red-50'
  if (sub.slaStatus === 'at_risk') return 'bg-orange-50'
  return ''
}

/* ─── Main component ─────────────────────────────────────── */
export default function TrackingDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab]               = useState<'orders'|'sellers'|'settings'>('orders')
  const [subOrders, setSubOrders]   = useState<SubOrder[]>([])
  const [sellers,   setSellers]     = useState<Seller[]>([])
  const [perfs,     setPerfs]       = useState<Performance[]>([])
  const [slaCfg,    setSLACfg]      = useState<SLACfg>({ acceptHours:24, shipDays:3, onAcceptBreach:'reassign', onShipBreach:'flag', notifyAdmin:true })
  const [loading,   setLoading]     = useState(true)
  const [total,     setTotal]       = useState(0)
  const [page,      setPage]        = useState(1)
  const LIMIT = 20

  // Filters
  const [search,        setSearch]        = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterSeller,  setFilterSeller]  = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterFrom,    setFilterFrom]    = useState('')
  const [filterTo,      setFilterTo]      = useState('')
  const [filterSLA,     setFilterSLA]     = useState('')

  // Modals
  const [reassignTarget,   setReassignTarget]   = useState<SubOrder|null>(null)
  const [reassignSellerId, setReassignSellerId] = useState('')
  const [reassignReason,   setReassignReason]   = useState('')
  const [reassigning,      setReassigning]      = useState(false)
  const [cancelTarget,     setCancelTarget]     = useState<SubOrder|null>(null)
  const [cancelReason,     setCancelReason]     = useState('')
  const [cancelling,       setCancelling]       = useState(false)
  const [logsTarget,       setLogsTarget]       = useState<SubOrder|null>(null)
  const [logs,             setLogs]             = useState<AssignmentLog[]>([])
  const [logsLoading,      setLogsLoading]      = useState(false)

  // SLA form
  const [slaForm,     setSlaForm]     = useState(slaCfg)
  const [savingSLA,   setSavingSLA]   = useState(false)

  /* ── Auth guard ── */
  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  /* ── Fetch orders ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (filterSeller) p.set('seller', filterSeller)
      if (filterStatus) p.set('status', filterStatus)
      if (filterFrom)   p.set('from',   filterFrom)
      if (filterTo)     p.set('to',     filterTo)
      if (debouncedSearch) p.set('search', debouncedSearch)
      if (filterSLA)    p.set('slaStatus', filterSLA)

      const res = await axios.get(`/api/admin/assignments?${p}`)
      setSubOrders(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch { toast.error('Failed to load orders') }
    finally  { setLoading(false) }
  }, [page, filterSeller, filterStatus, filterFrom, filterTo, debouncedSearch, filterSLA])

  /* ── Fetch sellers + SLA config ── */
  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        axios.get('/api/admin/sellers'),
        axios.get('/api/admin/sla-config'),
      ])
      setSellers(sRes.data.data || [])
      if (cRes.data.data) { setSLACfg(cRes.data.data); setSlaForm(cRes.data.data) }
    } catch { /* non-critical */ }
  }, [])

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/seller-performance')
      setPerfs(res.data.data || [])
    } catch { toast.error('Failed to load performance data') }
  }, [])

  useEffect(() => { if (user?.role === 'admin') { fetchOrders(); fetchMeta() } }, [fetchOrders, fetchMeta, user])
  useEffect(() => { if (tab === 'sellers') fetchPerformance() }, [tab, fetchPerformance])

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(fetchOrders, 60000)
    return () => clearInterval(t)
  }, [fetchOrders])

  /* ── Debounced search ── */
  function handleSearch(v: string) {
    setSearch(v); setPage(1)
  }

  // Debounce the search box: update debouncedSearch 400ms after typing stops.
  // fetchOrders depends on debouncedSearch, so exactly one request fires per pause.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  /* ── Stats row ── */
  const now = Date.now()
  const breached = subOrders.filter(s => {
    const ab = s.acceptDeadline && new Date(s.acceptDeadline).getTime() < now && s.status === 'confirmed'
    const sb = s.shipDeadline   && new Date(s.shipDeadline).getTime()   < now && ['confirmed','processing','packed'].includes(s.status)
    return ab || sb
  }).length
  const atRisk  = subOrders.filter(s => s.slaStatus === 'at_risk').length

  /* ── Reassign ── */
  async function handleReassign() {
    if (!reassignTarget || !reassignSellerId) return
    setReassigning(true)
    try {
      await axios.post(`/api/admin/assignments/${reassignTarget._id}/reassign`, { newSellerId: reassignSellerId, reason: reassignReason })
      toast.success('Reassigned'); setReassignTarget(null); setReassignSellerId(''); setReassignReason(''); fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Failed')
    } finally { setReassigning(false) }
  }

  /* ── Cancel ── */
  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await axios.post(`/api/admin/sub-orders/${cancelTarget._id}/cancel`, { reason: cancelReason })
      toast.success('Cancelled'); setCancelTarget(null); setCancelReason(''); fetchOrders()
    } catch { toast.error('Cancel failed') }
    finally  { setCancelling(false) }
  }

  /* ── Logs ── */
  async function openLogs(sub: SubOrder) {
    setLogsTarget(sub); setLogsLoading(true)
    try {
      const res = await axios.get(`/api/admin/assignments/${sub._id}/logs`)
      setLogs(res.data.data || [])
    } catch { toast.error('Failed') } finally { setLogsLoading(false) }
  }

  /* ── Trigger SLA cron manually ── */
  async function runSLACheck() {
    try {
      await axios.get('/api/cron/sla-check')
      toast.success('SLA check complete'); fetchOrders()
    } catch { toast.error('SLA check failed') }
  }

  /* ── Save SLA config ── */
  async function saveSLAConfig() {
    setSavingSLA(true)
    try {
      await axios.put('/api/admin/sla-config', slaForm)
      setSLACfg(slaForm); toast.success('SLA config saved')
    } catch { toast.error('Failed to save') } finally { setSavingSLA(false) }
  }

  /* ── Seed SLA test data ── */
  async function seedSLA() {
    try {
      const res = await axios.post('/api/seed/sla')
      toast.success(res.data.message); fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Seed failed')
    }
  }

  if (authLoading || !user) return null
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Order Tracking &amp; Problem Management</h1>
              <p className="text-xs text-gray-500">{total} sub-orders · auto-refreshes every 60s</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={seedSLA}     className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Seed SLA Test</button>
              <button onClick={runSLACheck} className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1"><FiZap className="text-xs"/>Run SLA Check</button>
              <button onClick={() => { fetchOrders(); fetchMeta() }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"><FiRefreshCw className="text-xs"/>Refresh</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(['orders','sellers','settings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab===t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {t === 'sellers' ? 'Seller Performance' : t === 'settings' ? 'SLA Config' : 'Orders'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* ══════════════ ORDERS TAB ══════════════ */}
        {tab === 'orders' && (<>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Total Sub-Orders', value: total,   color:'bg-indigo-50 border-indigo-200 text-indigo-700' },
              { label:'SLA Breached',     value: breached, color:'bg-red-50 border-red-200 text-red-700' },
              { label:'At Risk',          value: atRisk,   color:'bg-orange-50 border-orange-200 text-orange-700' },
              { label:'On Track',         value: subOrders.length - breached - atRisk, color:'bg-green-50 border-green-200 text-green-700' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by order ID, customer, product, or seller…"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FiFilter className="text-gray-400 text-sm flex-shrink-0" />
              <select value={filterSeller} onChange={e=>{setFilterSeller(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Sellers</option>
                {sellers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Statuses</option>
                {['confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned'].map(s=>
                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <select value={filterSLA} onChange={e=>{setFilterSLA(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All SLA</option>
                <option value="ok">OK</option>
                <option value="at_risk">At Risk</option>
                <option value="accept_breached">Accept Breached</option>
                <option value="ship_breached">Ship Breached</option>
              </select>
              <input type="date" value={filterFrom} onChange={e=>{setFilterFrom(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="date" value={filterTo}   onChange={e=>{setFilterTo(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {(filterSeller||filterStatus||filterFrom||filterTo||search||filterSLA) && (
                <button onClick={()=>{setFilterSeller('');setFilterStatus('');setFilterFrom('');setFilterTo('');setSearch('');setFilterSLA('');setPage(1)}}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5">
                  <FiX className="text-xs"/>Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : subOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiPackage className="text-4xl mx-auto mb-2" />
                <p className="font-medium">No sub-orders found</p>
                <p className="text-sm mt-1">Click &quot;Seed SLA Test&quot; then place an order to test SLA tracking.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Sub-Order / Order','Customer','Products','Seller','SLA Status','Order Status','Amount','Actions'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subOrders.map(sub => (
                      <tr key={sub._id} className={`hover:bg-gray-50 transition-colors ${rowUrgency(sub)}`}>

                        {/* Sub-order ID */}
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-gray-900">{sub.subOrderNumber}</p>
                          {sub.parentOrder && <p className="text-xs text-indigo-500">#{sub.parentOrder.orderNumber}</p>}
                          <p className="text-xs text-gray-400">{new Date(sub.createdAt).toLocaleDateString()}</p>
                          {sub.autoActionTaken && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                              Auto-{sub.autoActionType}
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">{sub.parentOrder?.user?.name}</p>
                          <p className="text-xs text-gray-400">{sub.parentOrder?.user?.email}</p>
                          <p className="text-xs text-gray-400">{sub.parentOrder?.shippingAddress?.city}</p>
                        </td>

                        {/* Products */}
                        <td className="px-4 py-3 max-w-[150px]">
                          {sub.items.slice(0,2).map((item,i)=>(
                            <p key={i} className="text-xs text-gray-700 truncate">{item.quantity}× {item.title}</p>
                          ))}
                          {sub.items.length>2 && <p className="text-xs text-gray-400">+{sub.items.length-2} more</p>}
                        </td>

                        {/* Seller */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {sub.seller?.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{sub.seller?.name}</p>
                              <p className="text-[10px] text-gray-400">{sub.seller?.email}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[120px] truncate" title={sub.assignmentReason}>
                            {sub.assignmentRule}
                          </p>
                        </td>

                        {/* SLA countdown */}
                        <td className="px-4 py-3">
                          <SLABadge sub={sub} />
                          {sub.acceptDeadline && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Accept by {new Date(sub.acceptDeadline).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                            </p>
                          )}
                          {sub.shipDeadline && (
                            <p className="text-[10px] text-gray-400">
                              Ship by {new Date(sub.shipDeadline).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[sub.status]||'bg-gray-100 text-gray-600'}`}>
                            {sub.status.replace(/_/g,' ')}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold">Rs.{sub.totalAmount.toLocaleString()}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={()=>{setReassignTarget(sub);setReassignSellerId('')}}
                              disabled={['delivered','cancelled','returned'].includes(sub.status)}
                              className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <FiEdit2 className="text-xs"/>Reassign
                            </button>
                            <button
                              onClick={()=>{setCancelTarget(sub);setCancelReason('')}}
                              disabled={['delivered','cancelled','returned'].includes(sub.status)}
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <FiTrash2 className="text-xs"/>Cancel
                            </button>
                            <button
                              onClick={()=>openLogs(sub)}
                              className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 whitespace-nowrap"
                            >
                              <FiList className="text-xs"/>History
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
                <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} total)</p>
                <div className="flex gap-1">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40">
                    <FiChevronLeft className="text-sm"/>
                  </button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40">
                    <FiChevronRight className="text-sm"/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>)}

        {/* ══════════════ SELLERS TAB ══════════════ */}
        {tab === 'sellers' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Seller Performance Scoreboard</h2>
                <p className="text-xs text-gray-500">Ranked by overall score. Lower-ranked sellers are deprioritised in auto-assignment.</p>
              </div>
              <button onClick={fetchPerformance} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                <FiRefreshCw className="text-xs"/>Refresh
              </button>
            </div>
            {perfs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FiTrendingUp className="text-3xl mx-auto mb-2"/>
                <p className="text-sm">No performance data yet. Sellers need to fulfil orders first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Rank','Seller','Score','Total Orders','Accept Rate','On-Time Ship','Cancel Rate','Delivered'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {perfs.map((p, i) => {
                      const score = p.overallScore ?? 100
                      const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-orange-500' : 'text-red-600'
                      const scoreBg    = score >= 70 ? 'bg-green-100' : score >= 40 ? 'bg-orange-100' : 'bg-red-100'
                      return (
                        <tr key={p.seller} className="hover:bg-gray-50 cursor-pointer"
                          onClick={()=>{setFilterSeller(p.seller);setTab('orders')}}>
                          <td className="px-4 py-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-400 text-white':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-600'}`}>
                              {i+1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{p.sellerName}</p>
                            <p className="text-xs text-gray-400">{p.sellerEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-black ${scoreBg} ${scoreColor}`}>{score}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.totalAssigned ?? 0}</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${((p.acceptanceRate||0)*100)>=80?'text-green-600':'text-orange-500'}`}>
                              {((p.acceptanceRate||0)*100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${((p.onTimeShipRate||0)*100)>=80?'text-green-600':'text-orange-500'}`}>
                              {((p.onTimeShipRate||0)*100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${((p.cancellationRate||0)*100)<=10?'text-green-600':'text-red-500'}`}>
                              {((p.cancellationRate||0)*100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.delivered ?? 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ SETTINGS TAB ══════════════ */}
        {tab === 'settings' && (
          <div className="bg-white rounded-xl border p-6 max-w-2xl space-y-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><FiSettings/>SLA Configuration</h2>
              <p className="text-sm text-gray-500 mt-1">These deadlines apply to every new order from the moment the sub-order is created.</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accept Deadline (hours)</label>
                <input type="number" min={1} value={slaForm.acceptHours}
                  onChange={e=>setSlaForm(f=>({...f,acceptHours:Number(e.target.value)}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">Seller must accept (mark Processing) within this many hours</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ship Deadline (days)</label>
                <input type="number" min={1} value={slaForm.shipDays}
                  onChange={e=>setSlaForm(f=>({...f,shipDays:Number(e.target.value)}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">Seller must ship within this many days</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">On Accept Breach</label>
                <select value={slaForm.onAcceptBreach} onChange={e=>setSlaForm(f=>({...f,onAcceptBreach:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="reassign">Auto-reassign to another seller</option>
                  <option value="cancel">Auto-cancel the sub-order</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">On Ship Breach</label>
                <select value={slaForm.onShipBreach} onChange={e=>setSlaForm(f=>({...f,onShipBreach:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="flag">Flag as breached (admin review)</option>
                  <option value="cancel">Auto-cancel</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="notifyAdmin" checked={slaForm.notifyAdmin}
                onChange={e=>setSlaForm(f=>({...f,notifyAdmin:e.target.checked}))}
                className="w-4 h-4 text-indigo-600 rounded" />
              <label htmlFor="notifyAdmin" className="text-sm text-gray-700">
                Send admin notification on every SLA breach
              </label>
            </div>

            <div className="pt-2 border-t flex items-center gap-3">
              <button onClick={saveSLAConfig} disabled={savingSLA}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
                {savingSLA ? 'Saving…' : 'Save SLA Config'}
              </button>
              <p className="text-xs text-gray-400">Current: Accept {slaCfg.acceptHours}h · Ship {slaCfg.shipDays}d · On breach: {slaCfg.onAcceptBreach}</p>
            </div>
          </div>
        )}

      </div>

      {/* ════ Reassign Modal ════ */}
      {reassignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Reassign Sub-Order</h2>
              <button onClick={()=>setReassignTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-medium">{reassignTarget.subOrderNumber}</p>
              <p className="text-xs text-gray-500">Currently: <strong>{reassignTarget.seller?.name}</strong></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Seller</label>
                <select value={reassignSellerId} onChange={e=>setReassignSellerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select a seller…</option>
                  {sellers.filter(s=>s._id!==reassignTarget.seller?._id).map(s=>(
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={reassignReason} onChange={e=>setReassignReason(e.target.value)}
                  placeholder="e.g. Original seller missed SLA" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setReassignTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleReassign} disabled={!reassignSellerId||reassigning}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
                {reassigning ? 'Reassigning…' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Cancel Modal ════ */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-red-600">Cancel Sub-Order</h2>
              <button onClick={()=>setCancelTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Cancel <strong>{cancelTarget.subOrderNumber}</strong> assigned to <strong>{cancelTarget.seller?.name}</strong>?
            </p>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)" rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setCancelTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">Back</button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold">
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ History Modal ════ */}
      {logsTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Assignment History</h2>
                <p className="text-xs text-gray-500">{logsTarget.subOrderNumber}</p>
              </div>
              <button onClick={()=>setLogsTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No assignment logs yet</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                {logs.map((log, i) => (
                  <li key={log._id||i} className="ml-4">
                    <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${log.rule.includes('sla')||log.rule==='manual'?'bg-orange-500':'bg-indigo-500'}`}/>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.rule.includes('sla')?'bg-red-100 text-red-700':log.rule==='manual'?'bg-orange-100 text-orange-700':'bg-indigo-100 text-indigo-700'}`}>
                          {log.rule.replace(/_/g,' ')}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.fromSeller && <p className="text-xs text-gray-600">From: {log.fromSeller.name}</p>}
                      <p className="text-xs text-gray-600">To: <strong>{log.toSeller?.name}</strong></p>
                      <p className="text-xs text-gray-500 mt-1">{log.reason}</p>
                      {log.performedBy && <p className="text-xs text-gray-400 mt-1">By: {log.performedBy.name}</p>}
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
