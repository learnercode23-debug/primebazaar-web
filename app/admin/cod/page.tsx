'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FiRefreshCw, FiDollarSign, FiAlertCircle,
  FiCheck, FiX, FiFilter, FiSettings, FiPackage, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'

/* ── Types ── */
interface CODOrder {
  _id: string; orderNumber: string; status: string; createdAt: string
  totalAmount: number; codFee: number; codCollected: boolean
  codCollectedAt?: string; codCollectedAmount?: number
  codRemittanceStatus: string; deliveryFailureReason?: string
  user: { name: string; email: string; phone?: string }
  items: Array<{ title: string; quantity: number }>
}
interface Stats { totalCOD: number; collected: number; pending: number; remitted: number }
interface CODSettings {
  maxOrderValue: number; handlingFee: number; handlingFeeType: string
  isEnabled: boolean; otpRequired: boolean; maxDailyOrdersPerCustomer: number
  serviceablePincodes: string[]
}

/* ── Colours ── */
const ORDER_STATUS: Record<string, string> = {
  confirmed:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700',
  packed:'bg-purple-100 text-purple-700', shipped:'bg-indigo-100 text-indigo-700',
  out_for_delivery:'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700',
  refused:'bg-red-100 text-red-700', cancelled:'bg-gray-100 text-gray-600',
}
const REMIT_COLOR: Record<string, string> = {
  pending:'bg-yellow-100 text-yellow-700', remitted:'bg-green-100 text-green-700',
  not_applicable:'bg-gray-100 text-gray-500',
}

export default function AdminCODPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'orders'|'remittance'|'settings'>('orders')

  /* Orders tab */
  const [orders,    setOrders]    = useState<CODOrder[]>([])
  const [stats,     setStats]     = useState<Stats>({ totalCOD:0, collected:0, pending:0, remitted:0 })
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const LIMIT = 20
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterCollected, setFilterCollected] = useState('')
  const [filterRemit,     setFilterRemit]     = useState('')

  /* Collect modal */
  const [collectTarget, setCollectTarget] = useState<CODOrder|null>(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectNote,   setCollectNote]   = useState('')
  const [collecting,    setCollecting]    = useState(false)

  /* Refuse modal */
  const [refuseTarget, setRefuseTarget] = useState<CODOrder|null>(null)
  const [refuseReason, setRefuseReason] = useState('')
  const [refusing,     setRefusing]     = useState(false)

  /* Assign agent modal */
  const [assignTarget,   setAssignTarget]   = useState<CODOrder|null>(null)
  const [agentList,      setAgentList]      = useState<Array<{_id:string;name:string;email:string}>>([])
  const [selectedAgent,  setSelectedAgent]  = useState('')
  const [assigning,      setAssigning]      = useState(false)

  /* Remittance tab */
  const [pendingOrders,  setPendingOrders]  = useState<CODOrder[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [remitNotes,     setRemitNotes]     = useState('')
  const [remitting,      setRemitting]      = useState(false)
  const [remittances,    setRemittances]    = useState<Array<{_id:string;totalAmount:number;orders:string[];createdAt:string;notes?:string;receivedBy:{name:string}}>>([])

  /* Settings tab */
  const [settings,     setSettings]     = useState<CODSettings|null>(null)
  const [settingsForm, setSettingsForm] = useState<Partial<CODSettings>>({})
  const [savingCfg,    setSavingCfg]    = useState(false)

  /* Auth guard */
  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  /* Fetch orders */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (filterStatus)    p.set('status',     filterStatus)
      if (filterCollected) p.set('collected',  filterCollected)
      if (filterRemit)     p.set('remittance', filterRemit)
      const res = await axios.get(`/api/cod/orders?${p}`)
      setOrders(res.data.data || [])
      setTotal(res.data.total || 0)
      setStats(res.data.stats || { totalCOD:0, collected:0, pending:0, remitted:0 })
    } catch { toast.error('Failed to load COD orders') }
    finally  { setLoading(false) }
  }, [page, filterStatus, filterCollected, filterRemit])

  /* Fetch settings */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get('/api/cod/settings')
      setSettings(res.data.data)
      setSettingsForm(res.data.data || {})
    } catch { /* non-critical */ }
  }, [])

  /* Fetch remittance data */
  const fetchRemittance = useCallback(async () => {
    try {
      const [pendRes, remitRes] = await Promise.all([
        axios.get('/api/cod/orders?collected=true&remittance=pending&limit=100'),
        axios.get('/api/cod/remittance'),
      ])
      setPendingOrders(pendRes.data.data || [])
      setRemittances(remitRes.data.data || [])
    } catch { toast.error('Failed to load remittance data') }
  }, [])

  useEffect(() => { if (user?.role === 'admin') { fetchOrders(); fetchSettings() } }, [fetchOrders, fetchSettings, user])
  useEffect(() => { if (tab === 'remittance' && user?.role === 'admin') fetchRemittance() }, [tab, fetchRemittance, user])

  /* Load users for agent dropdown — delivery-role agents first, all users as fallback */
  async function openAssignModal(order: CODOrder) {
    setAssignTarget(order)
    setSelectedAgent('')
    if (agentList.length === 0) {
      try {
        const agents = await axios.get('/api/admin/users?role=delivery&limit=100')
        if ((agents.data.data || []).length > 0) {
          setAgentList(agents.data.data)
        } else {
          const res = await axios.get('/api/admin/users?limit=100')
          setAgentList(res.data.data || [])
        }
      } catch { toast.error('Failed to load users') }
    }
  }

  /* Assign order to agent */
  async function handleAssign() {
    if (!assignTarget || !selectedAgent) return
    setAssigning(true)
    try {
      await axios.post(`/api/orders/${assignTarget._id}/assign`, { agentUserId: selectedAgent })
      toast.success('Order assigned! Agent can now see it at /delivery')
      setAssignTarget(null)
      setSelectedAgent('')
      fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Assign failed')
    } finally { setAssigning(false) }
  }

  /* Collect cash */
  async function handleCollect() {
    if (!collectTarget || !collectAmount) return
    setCollecting(true)
    try {
      const res = await axios.post(`/api/cod/${collectTarget._id}/collect`, {
        amountCollected: Number(collectAmount), agentNote: collectNote,
      })
      if (res.data.mismatch) {
        toast.error(`⚠️ ${res.data.message}`, { duration: 5000 })
      } else {
        toast.success('Cash collected!')
      }
      setCollectTarget(null); setCollectAmount(''); setCollectNote('')
      fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Failed')
    } finally { setCollecting(false) }
  }

  /* Refuse */
  async function handleRefuse() {
    if (!refuseTarget) return
    setRefusing(true)
    try {
      await axios.post(`/api/cod/${refuseTarget._id}/refuse`, { reason: refuseReason })
      toast.success('Order marked as refused')
      setRefuseTarget(null); setRefuseReason(''); fetchOrders()
    } catch { toast.error('Failed') } finally { setRefusing(false) }
  }

  /* Remittance batch */
  async function handleRemit() {
    if (selectedOrders.length === 0) return
    const total = pendingOrders
      .filter(o => selectedOrders.includes(o._id))
      .reduce((s, o) => s + (o.codCollectedAmount || o.totalAmount), 0)
    setRemitting(true)
    try {
      await axios.post('/api/cod/remittance', { orderIds: selectedOrders, totalAmount: total, notes: remitNotes })
      toast.success(`Remittance recorded: Rs.${total.toLocaleString()}`)
      setSelectedOrders([]); setRemitNotes(''); fetchRemittance()
    } catch { toast.error('Failed') } finally { setRemitting(false) }
  }

  /* Save settings */
  async function saveSettings() {
    setSavingCfg(true)
    try {
      // Send only the plain values, not the full mongoose document
      const payload = {
        maxOrderValue:             settingsForm.maxOrderValue,
        handlingFee:               settingsForm.handlingFee,
        handlingFeeType:           settingsForm.handlingFeeType,
        isEnabled:                 settingsForm.isEnabled,
        otpRequired:               settingsForm.otpRequired,
        maxDailyOrdersPerCustomer: settingsForm.maxDailyOrdersPerCustomer,
        serviceablePincodes:       settingsForm.serviceablePincodes || [],
      }
      await axios.put('/api/cod/settings', payload)
      toast.success('COD settings saved')
      fetchSettings()
    } catch (e: unknown) {
      const msg = (e as {response?:{data?:{error?:string}}})?.response?.data?.error
      toast.error(msg || 'Failed to save settings')
    } finally { setSavingCfg(false) }
  }

  /* Seed */
  async function handleSeed() {
    try {
      const res = await axios.post('/api/seed/cod')
      toast.success(res.data.message); fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Seed failed')
    }
  }

  if (authLoading || !user) return null
  const totalPages = Math.ceil(total / LIMIT)
  const remitTotal = pendingOrders
    .filter(o => selectedOrders.includes(o._id))
    .reduce((s, o) => s + (o.codCollectedAmount || o.totalAmount), 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">COD Management</h1>
              <p className="text-xs text-gray-500">Cash on Delivery — collection, reconciliation &amp; settlement</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleSeed} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Seed Demo Data</button>
              <button onClick={fetchOrders} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"><FiRefreshCw className="text-xs"/>Refresh</button>
            </div>
          </div>
          <div className="flex gap-1">
            {(['orders','remittance','settings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab===t?'bg-orange-500 text-white':'text-gray-600 hover:bg-gray-100'}`}>
                {t === 'remittance' ? 'Reconciliation' : t === 'settings' ? 'COD Settings' : 'Orders'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* ══════ ORDERS TAB ══════ */}
        {tab === 'orders' && (<>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border rounded-xl p-4 bg-blue-50 text-blue-700 border-blue-200">
              <p className="text-2xl font-black">{stats.totalCOD}</p><p className="text-xs font-medium">Total COD Orders</p>
            </div>
            <div className="border rounded-xl p-4 bg-green-50 text-green-700 border-green-200">
              <p className="text-2xl font-black">{stats.collected}</p><p className="text-xs font-medium">Cash Collected</p>
            </div>
            <div className="border rounded-xl p-4 bg-yellow-50 text-yellow-700 border-yellow-200">
              <p className="text-2xl font-black">{stats.pending}</p><p className="text-xs font-medium">Pending Remittance</p>
            </div>
            <div className="border rounded-xl p-4 bg-indigo-50 text-indigo-700 border-indigo-200">
              <p className="text-2xl font-black">{stats.remitted}</p><p className="text-xs font-medium">Remitted</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <FiFilter className="text-gray-400 text-sm flex-shrink-0"/>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">All Statuses</option>
                {['confirmed','processing','packed','shipped','out_for_delivery','delivered','refused','cancelled'].map(s=>
                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <select value={filterCollected} onChange={e=>{setFilterCollected(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">All Collection</option>
                <option value="true">Cash Collected</option>
                <option value="false">Not Collected</option>
              </select>
              <select value={filterRemit} onChange={e=>{setFilterRemit(e.target.value);setPage(1)}}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">All Remittance</option>
                <option value="pending">Pending</option>
                <option value="remitted">Remitted</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
              {(filterStatus||filterCollected||filterRemit) &&
                <button onClick={()=>{setFilterStatus('');setFilterCollected('');setFilterRemit('');setPage(1)}}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"><FiX/>Clear</button>}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <FiPackage className="text-4xl mx-auto mb-2"/>
                <p>No COD orders found. Click &quot;Seed Demo Data&quot; to create test orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Order','Customer','Items','Amount','Collection','Remittance','Actions'].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-bold text-gray-900">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ORDER_STATUS[order.status||'']||'bg-gray-100 text-gray-600'}`}>
                            {(order.status||'').replace(/_/g,' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-900">{order.user?.name}</p>
                          <p className="text-xs text-gray-400">{order.user?.phone || order.user?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {(order.items||[]).slice(0,2).map((item,i)=>(
                            <p key={i} className="text-xs text-gray-700 truncate max-w-[140px]">{item.quantity}× {item.title}</p>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold">Rs.{(order.totalAmount||0).toLocaleString()}</p>
                          {(order.codFee||0) > 0 && <p className="text-[10px] text-gray-400">incl. Rs.{order.codFee} COD fee</p>}
                        </td>
                        <td className="px-4 py-3">
                          {order.codCollected ? (
                            <div>
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><FiCheck/>Collected</span>
                              <p className="text-[10px] text-gray-400">Rs.{order.codCollectedAmount?.toLocaleString()}</p>
                              {order.codCollectedAmount && Math.abs(order.codCollectedAmount - order.totalAmount) > 1 && (
                                <span className="text-[10px] text-red-500 flex items-center gap-0.5"><FiAlertCircle/>Mismatch</span>
                              )}
                            </div>
                          ) : order.status === 'refused' ? (
                            <span className="text-xs text-red-500 flex items-center gap-1"><FiX/>Refused</span>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${REMIT_COLOR[order.codRemittanceStatus||'']||'bg-gray-100 text-gray-500'}`}>
                            {(order.codRemittanceStatus||'pending').replace(/_/g,' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {/* Assign to delivery agent */}
                            {!['delivered','cancelled','refused','returned'].includes(order.status) && (
                              <button onClick={()=>openAssignModal(order)}
                                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 whitespace-nowrap flex items-center gap-1">
                                🚴 Assign Agent
                              </button>
                            )}
                            {!order.codCollected && order.status === 'out_for_delivery' && (
                              <button onClick={()=>{setCollectTarget(order);setCollectAmount(String(order.totalAmount))}}
                                className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 whitespace-nowrap flex items-center gap-1">
                                <FiDollarSign className="text-xs"/>Collect Cash
                              </button>
                            )}
                            {!['delivered','cancelled','refused','returned'].includes(order.status) && (
                              <button onClick={()=>{setRefuseTarget(order);setRefuseReason('')}}
                                className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 whitespace-nowrap flex items-center gap-1">
                                <FiX className="text-xs"/>Mark Refused
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-1">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border hover:bg-gray-100 disabled:opacity-40"><FiChevronLeft className="text-sm"/></button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded border hover:bg-gray-100 disabled:opacity-40"><FiChevronRight className="text-sm"/></button>
                </div>
              </div>
            )}
          </div>
        </>)}

        {/* ══════ RECONCILIATION TAB ══════ */}
        {tab === 'remittance' && (<>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Pending orders for remittance */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Collected — Pending Remittance</h2>
                  <p className="text-xs text-gray-500">Select orders to create a remittance batch</p>
                </div>
                <button onClick={fetchRemittance} className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"><FiRefreshCw className="text-xs"/>Refresh</button>
              </div>
              {pendingOrders.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No collected orders pending remittance</p>
              ) : (
                <>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {pendingOrders.map(o => (
                      <label key={o._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedOrders.includes(o._id)}
                          onChange={e => setSelectedOrders(prev => e.target.checked ? [...prev,o._id] : prev.filter(id=>id!==o._id))}
                          className="w-4 h-4 text-orange-500 rounded" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">#{o.orderNumber}</p>
                          <p className="text-xs text-gray-500">{o.user?.name}</p>
                        </div>
                        <p className="text-xs font-semibold text-green-700">Rs.{(o.codCollectedAmount||o.totalAmount).toLocaleString()}</p>
                      </label>
                    ))}
                  </div>
                  {selectedOrders.length > 0 && (
                    <div className="p-4 border-t bg-orange-50 space-y-3">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>{selectedOrders.length} orders selected</span>
                        <span>Total: Rs.{remitTotal.toLocaleString()}</span>
                      </div>
                      <input value={remitNotes} onChange={e=>setRemitNotes(e.target.value)}
                        placeholder="Notes (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                      <button onClick={handleRemit} disabled={remitting}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm">
                        {remitting ? 'Recording…' : `Confirm Remittance — Rs.${remitTotal.toLocaleString()}`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Past remittances */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-900">Remittance History</h2>
                <p className="text-xs text-gray-500">Confirmed cash handovers</p>
              </div>
              {remittances.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No remittances recorded yet</p>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {remittances.map(r => (
                    <div key={r._id} className="px-4 py-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-900">Rs.{r.totalAmount?.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{r.orders?.length} orders</p>
                          {r.notes && <p className="text-xs text-gray-500 italic">{r.notes}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Confirmed</span>
                          <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">By {r.receivedBy?.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>)}

        {/* ══════ SETTINGS TAB ══════ */}
        {tab === 'settings' && settings && (
          <div className="bg-white rounded-xl border p-6 max-w-2xl space-y-5">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><FiSettings/>COD Configuration</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Value (Rs.)</label>
                <input type="number" value={settingsForm.maxOrderValue||''} onChange={e=>setSettingsForm(f=>({...f,maxOrderValue:Number(e.target.value)}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                <p className="text-xs text-gray-400 mt-1">Block COD above this amount</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handling Fee</label>
                <div className="flex gap-2">
                  <input type="number" value={settingsForm.handlingFee||''} onChange={e=>setSettingsForm(f=>({...f,handlingFee:Number(e.target.value)}))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
                  <select value={settingsForm.handlingFeeType||'fixed'} onChange={e=>setSettingsForm(f=>({...f,handlingFeeType:e.target.value}))}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="fixed">Rs. Fixed</option>
                    <option value="percentage">% of order</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max COD orders/customer/day</label>
                <input type="number" value={settingsForm.maxDailyOrdersPerCustomer||''} onChange={e=>setSettingsForm(f=>({...f,maxDailyOrdersPerCustomer:Number(e.target.value)}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serviceable Pincodes</label>
                <input value={(settingsForm.serviceablePincodes||[]).join(', ')}
                  onChange={e=>setSettingsForm(f=>({...f,serviceablePincodes:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}
                  placeholder="44600, 44601 (empty = all)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { key:'isEnabled',   label:'Enable COD globally' },
                { key:'otpRequired', label:'Require email OTP before placing COD order' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!(settingsForm as Record<string,unknown>)[key]}
                    onChange={e=>setSettingsForm(f=>({...f,[key]:e.target.checked}))}
                    className="w-4 h-4 text-orange-500 rounded"/>
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="pt-3 border-t">
              <button onClick={saveSettings} disabled={savingCfg}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                {savingCfg ? 'Saving…' : 'Save COD Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Collect Cash Modal ═══ */}
      {collectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">Collect Cash</h2>
              <button onClick={()=>setCollectTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium">#{collectTarget.orderNumber}</p>
              <p className="text-xs text-gray-500">Customer: {collectTarget.user?.name}</p>
              <p className="text-xs text-gray-500">
                Expected: Rs.{collectTarget.totalAmount.toLocaleString()}
                {(collectTarget.codFee||0) > 0 && <span className="text-gray-400"> (already incl. Rs.{collectTarget.codFee} COD fee)</span>}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Collected (Rs.)</label>
                <input type="number" value={collectAmount} onChange={e=>setCollectAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input value={collectNote} onChange={e=>setCollectNote(e.target.value)}
                  placeholder="e.g. customer paid exact change" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setCollectTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCollect} disabled={!collectAmount||collecting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                {collecting?'Saving…':'Confirm Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Refuse Modal ═══ */}
      {refuseTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-red-600">Mark as Refused</h2>
              <button onClick={()=>setRefuseTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            <p className="text-sm text-gray-700 mb-4">Order <strong>#{refuseTarget.orderNumber}</strong> — Rs.{refuseTarget.totalAmount.toLocaleString()}</p>
            <textarea value={refuseReason} onChange={e=>setRefuseReason(e.target.value)}
              placeholder="Reason for refusal (optional)" rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"/>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setRefuseTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Back</button>
              <button onClick={handleRefuse} disabled={refusing}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                {refusing?'Saving…':'Confirm Refused'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Assign Agent Modal ═══ */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">Assign Delivery Agent</h2>
              <button onClick={()=>setAssignTarget(null)}><FiX className="text-gray-400"/></button>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-medium">#{assignTarget.orderNumber}</p>
              <p className="text-xs text-gray-500">{assignTarget.user?.name} · Rs.{(assignTarget.totalAmount||0).toLocaleString()}</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Agent / User</label>
            <select
              value={selectedAgent}
              onChange={e=>setSelectedAgent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            >
              <option value="">Choose a user…</option>
              {agentList.map(a=>(
                <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mb-5">
              The selected user will see this order at <strong>/delivery</strong> and can verify the customer&apos;s code.
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setAssignTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleAssign} disabled={!selectedAgent||assigning}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                {assigning?'Assigning…':'Assign Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
