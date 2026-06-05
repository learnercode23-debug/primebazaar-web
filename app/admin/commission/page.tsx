'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FiDollarSign, FiTrendingUp, FiPackage, FiUsers,
  FiDownload, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiX, FiSearch
} from 'react-icons/fi'

/* ─── Types ─────────────────────────────────────────────── */
interface Summary { totalCommission:number; totalSalesVolume:number; pendingCommission:number; earnedCommission:number; orderCount:number; itemCount:number }
interface ProductRow { productTitle:string; totalCommission:number; totalSalesVolume:number; avgRate:number; orderCount:number; itemCount:number }
interface SellerRow  { sellerName:string; sellerEmail:string; totalCommission:number; totalSalesVolume:number; avgRate:number; orderCount:number }
interface TSPoint    { date:string; commission:number; salesVolume:number; orderCount:number }
interface Rule       { _id:string; scope:string; refId?:string; rateType:string; rateValue:number; isActive:boolean; description?:string; activeFrom?:string; activeTo?:string }

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(n:number) { return `Rs.${Math.round(n).toLocaleString()}` }
function pct(n:number) { return `${n?.toFixed(1)||'0'}%` }

export default function CommissionDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab,      setTab]      = useState<'summary'|'products'|'sellers'|'chart'|'rules'>('summary')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [interval, setInterval] = useState<'day'|'week'|'month'>('day')
  const [loading,  setLoading]  = useState(true)

  const [summary,   setSummary]  = useState<Summary|null>(null)
  const [products,  setProducts] = useState<ProductRow[]>([])
  const [sellers,   setSellers]  = useState<SellerRow[]>([])
  const [timeseries,setTS]       = useState<TSPoint[]>([])
  const [rules,     setRules]    = useState<Rule[]>([])
  const [sortBy,    setSortBy]   = useState('commission')
  const [search,    setSearch]   = useState('')

  // Rule form
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editRule,     setEditRule]     = useState<Rule|null>(null)
  const [ruleForm, setRuleForm] = useState({ scope:'global', refId:'', rateType:'percentage', rateValue:'10', description:'', activeFrom:'', activeTo:'', isActive:true })
  const [savingRule, setSavingRule]     = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('from', dateFrom)
    if (dateTo)   p.set('to',   dateTo)
    return p.toString()
  }, [dateFrom, dateTo])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const qs = buildParams()
    try {
      const [sumRes, prodRes, sellerRes, tsRes, rulesRes] = await Promise.all([
        axios.get(`/api/admin/commission/summary?${qs}`),
        axios.get(`/api/admin/commission/by-product?${qs}&sort=${sortBy}`),
        axios.get(`/api/admin/commission/by-seller?${qs}`),
        axios.get(`/api/admin/commission/timeseries?${qs}&interval=${interval}`),
        axios.get('/api/admin/commission/rules'),
      ])
      setSummary(sumRes.data.data)
      setProducts(prodRes.data.data || [])
      setSellers(sellerRes.data.data || [])
      setTS(tsRes.data.data || [])
      setRules(rulesRes.data.data || [])
    } catch { toast.error('Failed to load commission data') }
    finally  { setLoading(false) }
  }, [buildParams, sortBy, interval])

  useEffect(() => { if (user?.role === 'admin') fetchAll() }, [fetchAll, user])

  async function exportCSV() {
    const qs = buildParams()
    window.open(`/api/admin/commission/export?${qs}`, '_blank')
  }

  async function saveRule(e: React.FormEvent) {
    e.preventDefault()
    setSavingRule(true)
    try {
      const payload = {
        ...ruleForm,
        rateValue:  Number(ruleForm.rateValue),
        refId:      ruleForm.refId || undefined,
        activeFrom: ruleForm.activeFrom || undefined,
        activeTo:   ruleForm.activeTo   || undefined,
      }
      if (editRule) {
        await axios.patch(`/api/admin/commission/rules/${editRule._id}`, payload)
        toast.success('Rule updated')
      } else {
        await axios.post('/api/admin/commission/rules', payload)
        toast.success('Rule created')
      }
      setShowRuleForm(false); setEditRule(null)
      setRuleForm({ scope:'global', refId:'', rateType:'percentage', rateValue:'10', description:'', activeFrom:'', activeTo:'', isActive:true })
      fetchAll()
    } catch { toast.error('Failed to save rule') }
    finally  { setSavingRule(false) }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return
    await axios.delete(`/api/admin/commission/rules/${id}`)
    toast.success('Rule deleted')
    fetchAll()
  }

  function openEditRule(r: Rule) {
    setEditRule(r)
    setRuleForm({
      scope: r.scope, refId: r.refId || '', rateType: r.rateType,
      rateValue: String(r.rateValue), description: r.description || '',
      activeFrom: r.activeFrom?.slice(0,10) || '', activeTo: r.activeTo?.slice(0,10) || '',
      isActive: r.isActive,
    })
    setShowRuleForm(true)
  }

  const filteredProducts = products.filter(p =>
    !search || p.productTitle?.toLowerCase().includes(search.toLowerCase())
  )

  const maxTS = Math.max(...timeseries.map(t => t.commission), 1)

  if (authLoading || !user) return null

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commission Tracking</h1>
          <p className="text-sm text-gray-500">Platform earnings from all sales</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <FiDownload className="text-xs"/> Export CSV
          </button>
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <FiRefreshCw className="text-xs"/> Refresh
          </button>
        </div>
      </div>

      {/* ── Date filters ── */}
      <div className="flex gap-3 items-center flex-wrap bg-white border rounded-xl p-4">
        <label className="text-sm font-medium text-gray-600">Date range:</label>
        <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value)}}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        {(dateFrom || dateTo) && (
          <button onClick={()=>{setDateFrom('');setDateTo('')}} className="text-xs text-red-500 hover:text-red-700">Clear</button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap">
        {([
          { key:'summary',  label:'Summary' },
          { key:'products', label:'By Product' },
          { key:'sellers',  label:'By Seller' },
          { key:'chart',    label:'Over Time' },
          { key:'rules',    label:'Commission Rules' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab===t.key?'bg-indigo-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ SUMMARY TAB ══════ */}
      {tab === 'summary' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label:'Total Commission',   value: fmt(summary?.totalCommission||0),   color:'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FiDollarSign },
                  { label:'Total Sales Volume', value: fmt(summary?.totalSalesVolume||0),   color:'bg-blue-50 text-blue-700 border-blue-200',       icon: FiTrendingUp },
                  { label:'Pending',            value: fmt(summary?.pendingCommission||0),  color:'bg-yellow-50 text-yellow-700 border-yellow-200',  icon: FiDollarSign },
                  { label:'Earned (Released)',  value: fmt(summary?.earnedCommission||0),   color:'bg-green-50 text-green-700 border-green-200',     icon: FiDollarSign },
                  { label:'Orders',             value: summary?.orderCount||0,              color:'bg-purple-50 text-purple-700 border-purple-200',  icon: FiPackage },
                  { label:'Line Items',         value: summary?.itemCount||0,               color:'bg-gray-50 text-gray-700 border-gray-200',        icon: FiPackage },
                ].map(s => (
                  <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
                    <p className="text-lg font-black">{s.value}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {summary && summary.totalSalesVolume > 0 && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-3">Effective Commission Rate</h3>
                  <p className="text-3xl font-black text-indigo-600">
                    {((summary.totalCommission / summary.totalSalesVolume) * 100).toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Rs.{Math.round(summary.totalCommission).toLocaleString()} earned on Rs.{Math.round(summary.totalSalesVolume).toLocaleString()} in sales
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ BY PRODUCT TAB ══════ */}
      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search product..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <select value={sortBy} onChange={e=>{setSortBy(e.target.value)}}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="commission">Sort: Highest Commission</option>
              <option value="volume">Sort: Highest Volume</option>
              <option value="orders">Sort: Most Orders</option>
            </select>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No commission data yet. Sales will appear here after orders are delivered.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Product','Units','Sales Volume','Rate','Commission'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{p.productTitle}</p>
                        <p className="text-xs text-gray-400">{p.orderCount} orders</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{p.itemCount}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{fmt(p.totalSalesVolume)}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{pct(p.avgRate)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-700">{fmt(p.totalCommission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════ BY SELLER TAB ══════ */}
      {tab === 'sellers' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Seller','Email','Orders','Sales Volume','Avg Rate','Commission'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellers.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">{s.sellerName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.sellerEmail}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{s.orderCount}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">{fmt(s.totalSalesVolume)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{pct(s.avgRate)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-indigo-700">{fmt(s.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════ TIMESERIES CHART TAB ══════ */}
      {tab === 'chart' && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-gray-900">Commission Over Time</h2>
            <select value={interval} onChange={e=>setInterval(e.target.value as 'day'|'week'|'month')}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : timeseries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No data for the selected period.</div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                {timeseries.map((pt, i) => {
                  const h = Math.max((pt.commission / maxTS) * 100, 2)
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 group" style={{ minWidth: '32px' }}>
                      <div className="relative">
                        <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                          {pt.date}: {fmt(pt.commission)}
                        </div>
                        <div className="bg-indigo-500 hover:bg-indigo-600 rounded-t transition-colors cursor-pointer"
                          style={{ height: `${Math.round((pt.commission/maxTS)*160)}px`, width: '24px' }}/>
                      </div>
                      <p className="text-[9px] text-gray-400 rotate-45 origin-top-left w-6 overflow-hidden whitespace-nowrap">{pt.date.slice(5)}</p>
                    </div>
                  )
                })}
              </div>

              {/* Data table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Period','Orders','Commission','Sales Volume'].map(h=>(
                        <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {timeseries.slice().reverse().map((pt, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{pt.date}</td>
                        <td className="px-3 py-2 text-gray-600">{pt.orderCount}</td>
                        <td className="px-3 py-2 font-bold text-indigo-600">{fmt(pt.commission)}</td>
                        <td className="px-3 py-2 text-gray-600">{fmt(pt.salesVolume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ RULES TAB ══════ */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditRule(null); setRuleForm({ scope:'global', refId:'', rateType:'percentage', rateValue:'10', description:'', activeFrom:'', activeTo:'', isActive:true }); setShowRuleForm(true) }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">
              <FiPlus/> New Rule
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-indigo-900 mb-1">Rate Resolution Priority</p>
            <p className="text-indigo-700">Product rule → Category rule → Seller rule → Global rule → Category default (10%)</p>
            <p className="text-indigo-600 text-xs mt-1">The most specific rule wins. Historical commissions are stored with the rate that was applied, so changing rules won&apos;t affect past records.</p>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            {rules.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No custom rules. Click &quot;New Rule&quot; to add one. Category defaults are used otherwise.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Scope','Rate','Type','Active Dates','Status','Description','Actions'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          r.scope==='global'?'bg-purple-100 text-purple-700':r.scope==='product'?'bg-blue-100 text-blue-700':r.scope==='category'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'
                        }`}>{r.scope}</span>
                        {r.refId && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{r.refId.slice(-8)}</p>}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{r.rateType==='percentage'?`${r.rateValue}%`:`Rs.${r.rateValue}`}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{r.rateType}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.activeFrom ? new Date(r.activeFrom).toLocaleDateString() : '∞'} – {r.activeTo ? new Date(r.activeTo).toLocaleDateString() : '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {r.isActive?'Active':'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEditRule(r)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><FiEdit2/>Edit</button>
                          <button onClick={() => deleteRule(r._id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"><FiTrash2/>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ Rule Form Modal ══ */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">{editRule ? 'Edit Commission Rule' : 'New Commission Rule'}</h2>
              <button onClick={() => setShowRuleForm(false)}><FiX className="text-gray-400"/></button>
            </div>
            <form onSubmit={saveRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                <select value={ruleForm.scope} onChange={e=>setRuleForm(f=>({...f,scope:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="global">Global (applies to all)</option>
                  <option value="category">Category</option>
                  <option value="seller">Seller</option>
                  <option value="product">Product</option>
                </select>
              </div>
              {ruleForm.scope !== 'global' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{ruleForm.scope.charAt(0).toUpperCase()+ruleForm.scope.slice(1)} ID</label>
                  <input value={ruleForm.refId} onChange={e=>setRuleForm(f=>({...f,refId:e.target.value}))}
                    placeholder={`Paste the ${ruleForm.scope} MongoDB _id`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
                  <select value={ruleForm.rateType} onChange={e=>setRuleForm(f=>({...f,rateType:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate {ruleForm.rateType==='percentage'?'(%)':'(Rs.)'}
                  </label>
                  <input type="number" step="0.1" min="0" value={ruleForm.rateValue}
                    onChange={e=>setRuleForm(f=>({...f,rateValue:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active From</label>
                  <input type="date" value={ruleForm.activeFrom} onChange={e=>setRuleForm(f=>({...f,activeFrom:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active To</label>
                  <input type="date" value={ruleForm.activeTo} onChange={e=>setRuleForm(f=>({...f,activeTo:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input value={ruleForm.description} onChange={e=>setRuleForm(f=>({...f,description:e.target.value}))}
                  placeholder="e.g. Electronics category rate"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ruleForm.isActive} onChange={e=>setRuleForm(f=>({...f,isActive:e.target.checked}))} className="w-4 h-4 text-indigo-600 rounded"/>
                <span className="text-sm text-gray-700">Active (will be applied to new orders)</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRuleForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={savingRule}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                  {savingRule ? 'Saving...' : editRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
