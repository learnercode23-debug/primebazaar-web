'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiPlus, FiZap, FiTrendingUp, FiEye, FiMousePointer, FiPause, FiPlay, FiTrash2, FiTarget, FiDollarSign, FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Campaign {
  _id: string; productTitle: string; productImage: string
  budget: number; spend: number; impressions: number; clicks: number
  orders: number; revenue: number; bid: number
  status: 'active' | 'paused' | 'ended'
  type: 'auto' | 'manual'; startDate?: string; endDate?: string
  keywords?: string[]
}
interface SellerProduct { _id: string; title: string; images: string[] }

export default function SellerAdsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all')
  const [tab, setTab] = useState<'campaigns' | 'keywords'>('campaigns')
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [form, setForm] = useState({ productId: '', type: 'manual', budget: 500, bid: 5, startDate: '', endDate: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) { router.push('/'); return }
    Promise.all([
      axios.get('/api/seller/ads').then(r => setCampaigns(r.data.data || [])).catch(() => {}),
      axios.get('/api/seller/products').then(r => setProducts(r.data.data || [])).catch(() => {}),
    ]).finally(() => setLoadingData(false))
  }, [user, loading, router])

  if (loading || !user || loadingData) return <LoadingSpinner fullPage />

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)
  const totalSpent       = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalOrders      = campaigns.reduce((s, c) => s + c.orders, 0)
  const totalRevenue     = campaigns.reduce((s, c) => s + c.revenue, 0)
  const avgCtr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const acos   = totalRevenue ? ((totalSpent / totalRevenue) * 100).toFixed(1) : '0.0'
  const roas   = totalSpent ? (totalRevenue / totalSpent).toFixed(2) : '0.00'
  const selectedCampaign = campaigns.find(c => c._id === selectedId) || campaigns.find(c => c.type === 'manual') || null

  async function createCampaign() {
    if (!form.productId) { toast.error('Choose a product to advertise'); return }
    setCreating(true)
    try {
      const r = await axios.post('/api/seller/ads', form)
      setCampaigns(cs => [r.data.data, ...cs])
      setShowCreate(false)
      setForm({ productId: '', type: 'manual', budget: 500, bid: 5, startDate: '', endDate: '' })
      toast.success('Campaign launched!')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create campaign')
    } finally { setCreating(false) }
  }

  async function toggleStatus(c: Campaign) {
    const status = c.status === 'active' ? 'paused' : 'active'
    setCampaigns(cs => cs.map(x => x._id === c._id ? { ...x, status } : x))
    try { await axios.patch('/api/seller/ads', { id: c._id, status }) }
    catch { toast.error('Failed to update'); setCampaigns(cs => cs.map(x => x._id === c._id ? { ...x, status: c.status } : x)) }
  }

  async function removeCampaign(id: string) {
    setCampaigns(cs => cs.filter(x => x._id !== id))
    try { await axios.delete('/api/seller/ads', { data: { id } }); toast.success('Campaign deleted') }
    catch { toast.error('Failed to delete') }
  }

  async function saveKeywords(id: string, keywords: string[]) {
    setCampaigns(cs => cs.map(c => c._id === id ? { ...c, keywords } : c))
    try { await axios.patch('/api/seller/ads', { id, keywords }) }
    catch { toast.error('Failed to save keyword') }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/seller" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Seller Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiZap className="text-violet-600" /> Sponsored Ads</h1>
          <p className="text-sm text-gray-500">Promote your products · Keyword targeting · ACoS / ROAS analytics</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md">
          <FiPlus /> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { icon: FiZap,          label: 'Total Spent',  value: `Rs.${totalSpent.toLocaleString()}` },
          { icon: FiEye,          label: 'Impressions',  value: totalImpressions.toLocaleString() },
          { icon: FiMousePointer, label: 'Clicks',       value: totalClicks.toLocaleString() },
          { icon: FiTrendingUp,   label: 'CTR',          value: `${avgCtr}%` },
          { icon: FiTarget,       label: 'Orders',       value: totalOrders },
          { icon: FiDollarSign,   label: 'Ad Revenue',   value: `Rs.${totalRevenue.toLocaleString()}` },
          { icon: FiTrendingUp,   label: 'ROAS',         value: `${roas}×` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm text-center">
            <Icon className="text-violet-500 mx-auto mb-1 text-sm" />
            <p className="text-base font-black text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white border border-gray-100 rounded-2xl">
          <FiZap className="text-4xl mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">No campaigns yet</p>
          <p className="text-sm mt-1 text-gray-400">Create a campaign to promote a product. Metrics accrue as shoppers see and click your ad.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {[{ key: 'campaigns', label: 'Campaigns' }, { key: 'keywords', label: 'Keyword Targeting' }].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as typeof tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${tab === key ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'campaigns' && (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(['all', 'active', 'paused', 'ended'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize ${filter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {filtered.map(c => {
                  const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
                  const cRoas = c.spend ? (c.revenue / c.spend).toFixed(2) : '—'
                  const budgetPct = c.budget ? Math.min(100, Math.round((c.spend / c.budget) * 100)) : 0
                  return (
                    <div key={c._id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-violet-200 transition-colors">
                      <div className="flex items-start gap-4 flex-wrap">
                        {c.productImage && <img src={c.productImage} alt={c.productTitle} className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-bold text-gray-900 text-sm line-clamp-1">{c.productTitle}</p>
                              <p className="text-xs text-gray-400 capitalize">{c.type} targeting · bid Rs.{c.bid}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                              c.status === 'active' ? 'bg-green-100 text-green-700' :
                              c.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                            }`}>{c.status === 'active' ? '● ' : ''}{c.status}</span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 mt-3">
                            {[
                              { label: 'Impressions', value: c.impressions.toLocaleString() },
                              { label: 'Clicks', value: c.clicks.toLocaleString() },
                              { label: 'CTR', value: `${ctr}%` },
                              { label: 'Orders', value: c.orders },
                              { label: 'Revenue', value: `Rs.${c.revenue.toLocaleString()}` },
                              { label: 'ROAS', value: `${cRoas}×` },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                                <p className="text-sm font-bold text-gray-900">{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                              <span>Spend: Rs.{c.spend.toLocaleString()} / Rs.{c.budget.toLocaleString()} budget</span>
                              <span>{budgetPct}% used</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${budgetPct >= 90 ? 'bg-red-400' : 'bg-violet-500'}`} style={{ width: `${budgetPct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {c.status !== 'ended' && (
                            <button onClick={() => toggleStatus(c)}
                              className="w-9 h-9 rounded-xl border border-gray-200 hover:border-violet-300 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"
                              title={c.status === 'active' ? 'Pause' : 'Resume'}>
                              {c.status === 'active' ? <FiPause className="text-sm" /> : <FiPlay className="text-sm" />}
                            </button>
                          )}
                          <button onClick={() => removeCampaign(c._id)}
                            className="w-9 h-9 rounded-xl border border-gray-200 hover:border-red-300 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    <FiZap className="text-4xl mx-auto mb-3 text-gray-300" />
                    <p className="font-semibold">No {filter !== 'all' ? filter : ''} campaigns</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'keywords' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-gray-900">Keywords: {selectedCampaign?.productTitle || '—'}</h2>
                <select value={selectedCampaign?._id || ''} className="text-sm border border-gray-200 rounded-xl px-3 py-1.5"
                  onChange={e => setSelectedId(e.target.value)}>
                  {campaigns.filter(c => c.type === 'manual').map(c => (
                    <option key={c._id} value={c._id}>{c.productTitle}</option>
                  ))}
                </select>
              </div>
              {selectedCampaign?.type === 'manual' ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                      placeholder="Add a keyword (e.g. bluetooth earbuds nepal)"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    <button onClick={() => {
                      if (!newKeyword.trim() || !selectedCampaign) return
                      saveKeywords(selectedCampaign._id, [...(selectedCampaign.keywords || []), newKeyword.trim()])
                      setNewKeyword('')
                    }} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedCampaign.keywords || []).length === 0 && <p className="text-sm text-gray-400">No keywords yet.</p>}
                    {(selectedCampaign.keywords || []).map((kw, i) => (
                      <span key={i} className="flex items-center gap-2 bg-violet-50 text-violet-800 px-3 py-1.5 rounded-full text-sm font-medium">
                        {kw}
                        <button onClick={() => saveKeywords(selectedCampaign._id, (selectedCampaign.keywords || []).filter((_, j) => j !== i))}
                          className="text-violet-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiTarget className="text-3xl mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{selectedCampaign ? 'Auto campaigns target keywords automatically.' : 'Create a manual campaign to manage keywords.'}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className={`grid sm:grid-cols-2 gap-3 mt-5 ${campaigns.length === 0 ? 'hidden' : ''}`}>
        <div className={`rounded-xl p-3 border text-sm ${parseFloat(acos) > 30 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-bold">ACoS {acos}%</p>
          <p className="text-xs mt-0.5 opacity-80">ACoS = Ad Spend ÷ Ad Revenue × 100 · Target &lt;25%</p>
        </div>
        <div className={`rounded-xl p-3 border text-sm ${parseFloat(roas) < 2 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-bold">ROAS {roas}×</p>
          <p className="text-xs mt-0.5 opacity-80">ROAS = Ad Revenue ÷ Ad Spend · Target &gt;3×</p>
        </div>
      </div>

      {/* Create campaign modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-auto">
            <h2 className="font-black text-gray-900 text-lg mb-4">Create Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Product to advertise *</label>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  <option value="">Choose a product…</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                </select>
                {products.length === 0 && <p className="text-xs text-amber-600 mt-1">You have no products yet — add one first.</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Campaign type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ type: 'auto', label: '⚡ Automatic', desc: 'AI picks keywords' }, { type: 'manual', label: '🎯 Manual', desc: 'You choose keywords' }].map(o => (
                    <button key={o.type} onClick={() => setForm(f => ({ ...f, type: o.type }))}
                      className={`border rounded-xl p-3 text-left transition-colors ${form.type === o.type ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}>
                      <p className="text-sm font-bold text-gray-900">{o.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Daily budget (Rs.)</label>
                  <input type="number" value={form.budget} min={100} onChange={e => setForm(f => ({ ...f, budget: +e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Bid / click (Rs.)</label>
                  <input type="number" value={form.bid} min={1} onChange={e => setForm(f => ({ ...f, bid: +e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Start date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">End date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createCampaign} disabled={creating || !form.productId}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                {creating ? 'Launching…' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
