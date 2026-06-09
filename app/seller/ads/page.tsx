'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiPlus, FiZap, FiTrendingUp, FiEye, FiMousePointer, FiPause, FiPlay, FiTrash2, FiTarget, FiDollarSign, FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Campaign {
  id: string; productTitle: string; productImage: string
  budget: number; spent: number; impressions: number; clicks: number
  orders: number; revenue: number; cpc: number
  status: 'active' | 'paused' | 'ended'
  type: 'auto' | 'manual'; startDate: string; endDate: string
  keywords?: string[]
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', productTitle: 'Wireless Earbuds Pro X',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100',
    budget: 2000, spent: 1240, impressions: 18400, clicks: 342, orders: 28, revenue: 8960,
    cpc: 3.62, status: 'active', type: 'manual', startDate: '2026-06-01', endDate: '2026-06-15',
    keywords: ['wireless earbuds', 'bluetooth earphones', 'noise cancelling'],
  },
  {
    id: 'c2', productTitle: 'Smart Watch Series 4',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100',
    budget: 1500, spent: 1500, impressions: 12300, clicks: 198, orders: 14, revenue: 5880,
    cpc: 7.57, status: 'ended', type: 'auto', startDate: '2026-05-15', endDate: '2026-05-31',
    keywords: [],
  },
  {
    id: 'c3', productTitle: 'USB-C Hub 7-in-1',
    productImage: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100',
    budget: 800, spent: 120, impressions: 2100, clicks: 41, orders: 3, revenue: 840,
    cpc: 2.93, status: 'paused', type: 'manual', startDate: '2026-06-05', endDate: '2026-06-20',
    keywords: ['usb hub', 'type c hub', 'laptop accessories'],
  },
]

const DAILY_DATA = [42,55,38,61,70,48,53,66,72,58,80,74,68,85,91,78,88,95,83,76,92,87,99,105,96,112,108,118,124,131]

function LineChart({ data, color = '#7c3aed', height = 80 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data); const min = Math.min(...data)
  const W = 400; const pad = 8
  const toX = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2)
  const toY = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2)
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const area = d + ` L${toX(data.length - 1)},${height} L${toX(0)},${height} Z`
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#adGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SellerAdsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all')
  const [tab, setTab] = useState<'campaigns' | 'keywords' | 'performance'>('campaigns')
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(campaigns[0])

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) router.push('/')
  }, [user, loading, router])

  if (loading || !user) return null

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)
  const totalSpent      = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks     = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalOrders     = campaigns.reduce((s, c) => s + c.orders, 0)
  const totalRevenue    = campaigns.reduce((s, c) => s + c.revenue, 0)
  const avgCtr  = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const acos    = totalRevenue ? ((totalSpent / totalRevenue) * 100).toFixed(1) : '0.0'
  const roas    = totalSpent ? (totalRevenue / totalSpent).toFixed(2) : '0.00'
  const avgCpc  = totalClicks ? (totalSpent / totalClicks).toFixed(2) : '0.00'

  function toggleStatus(id: string) {
    setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/seller" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Seller Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiZap className="text-violet-600" /> Sponsored Ads</h1>
          <p className="text-sm text-gray-500">Campaign manager · Keyword targeting · ACoS / ROAS analytics</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md">
          <FiPlus /> Create Campaign
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { icon: FiZap,          label: 'Total Spent',   value: `Rs.${totalSpent.toLocaleString()}` },
          { icon: FiEye,          label: 'Impressions',   value: totalImpressions.toLocaleString() },
          { icon: FiMousePointer, label: 'Clicks',        value: totalClicks.toLocaleString() },
          { icon: FiTrendingUp,   label: 'CTR',           value: `${avgCtr}%` },
          { icon: FiTarget,       label: 'Orders',        value: totalOrders },
          { icon: FiDollarSign,   label: 'Ad Revenue',    value: `Rs.${totalRevenue.toLocaleString()}` },
          { icon: FiTrendingUp,   label: 'ACoS',          value: `${acos}%`,  color: parseFloat(acos) > 30 ? 'text-red-600' : 'text-green-600' },
          { icon: FiTrendingUp,   label: 'ROAS',          value: `${roas}×`,  color: parseFloat(roas) < 2 ? 'text-amber-600' : 'text-green-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm text-center">
            <Icon className="text-violet-500 mx-auto mb-1 text-sm" />
            <p className={`text-base font-black ${color || 'text-gray-900'}`}>{value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ACoS / ROAS explanation */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className={`rounded-xl p-3 border text-sm ${parseFloat(acos) > 30 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-bold">ACoS {acos}% {parseFloat(acos) > 30 ? '⚠ Above target' : '✓ Healthy'}</p>
          <p className="text-xs mt-0.5 opacity-80">Target: &lt;25% · ACoS = Ad Spend ÷ Ad Revenue × 100</p>
        </div>
        <div className={`rounded-xl p-3 border text-sm ${parseFloat(roas) < 2 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <p className="font-bold">ROAS {roas}× {parseFloat(roas) < 2 ? '⚠ Below target' : '✓ Healthy'}</p>
          <p className="text-xs mt-0.5 opacity-80">Target: &gt;3× · ROAS = Ad Revenue ÷ Ad Spend</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'campaigns', label: 'Campaigns' },
          { key: 'keywords', label: 'Keyword Targeting' },
          { key: 'performance', label: 'Performance Chart' },
        ].map(({ key, label }) => (
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
              const ctr   = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
              const cAcos = c.revenue ? ((c.spent / c.revenue) * 100).toFixed(1) : '—'
              const cRoas = c.spent ? (c.revenue / c.spent).toFixed(2) : '—'
              const budgetPct = Math.min(100, Math.round((c.spent / c.budget) * 100))
              return (
                <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-violet-200 transition-colors">
                  <div className="flex items-start gap-4 flex-wrap">
                    <img src={c.productImage} alt={c.productTitle} className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{c.productTitle}</p>
                          <p className="text-xs text-gray-400">{c.startDate} → {c.endDate} · <span className="capitalize">{c.type}</span> targeting</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' :
                          c.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.status === 'active' ? '● ' : ''}{c.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-4 gap-y-2 mt-3">
                        {[
                          { label: 'Impressions', value: c.impressions.toLocaleString() },
                          { label: 'Clicks', value: c.clicks.toLocaleString() },
                          { label: 'CTR', value: `${ctr}%` },
                          { label: 'CPC', value: `Rs.${c.cpc}` },
                          { label: 'Orders', value: c.orders },
                          { label: 'Revenue', value: `Rs.${c.revenue.toLocaleString()}` },
                          { label: 'ACoS', value: `${cAcos}%` },
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
                          <span>Budget: Rs.{c.spent.toLocaleString()} / Rs.{c.budget.toLocaleString()}</span>
                          <span>{budgetPct}% used</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${budgetPct >= 90 ? 'bg-red-400' : 'bg-violet-500'}`} style={{ width: `${budgetPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {c.status !== 'ended' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => toggleStatus(c.id)}
                          className="w-9 h-9 rounded-xl border border-gray-200 hover:border-violet-300 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"
                          title={c.status === 'active' ? 'Pause' : 'Resume'}>
                          {c.status === 'active' ? <FiPause className="text-sm" /> : <FiPlay className="text-sm" />}
                        </button>
                        <button onClick={() => setCampaigns(cs => cs.filter(x => x.id !== c.id))}
                          className="w-9 h-9 rounded-xl border border-gray-200 hover:border-red-300 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    )}
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
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Campaign: {selectedCampaign?.productTitle}</h2>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-1.5"
                onChange={e => setSelectedCampaign(campaigns.find(c => c.id === e.target.value) || null)}>
                {campaigns.filter(c => c.type === 'manual').map(c => (
                  <option key={c.id} value={c.id}>{c.productTitle}</option>
                ))}
              </select>
            </div>

            {selectedCampaign?.type === 'manual' ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Add keyword (e.g. bluetooth earbuds nepal)"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <button onClick={() => {
                    if (!newKeyword.trim()) return
                    setCampaigns(cs => cs.map(c => c.id === selectedCampaign.id
                      ? { ...c, keywords: [...(c.keywords || []), newKeyword.trim()] } : c))
                    setNewKeyword('')
                    toast.success('Keyword added')
                  }} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl">
                    Add
                  </button>
                </div>

                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-400 border-b">
                    <th className="py-2 text-left">Keyword</th>
                    <th className="py-2 text-right">Match</th>
                    <th className="py-2 text-right">Bid (Rs.)</th>
                    <th className="py-2 text-right">Est. Clicks</th>
                    <th className="py-2 text-right"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(selectedCampaign.keywords || []).map((kw, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{kw}</td>
                        <td className="py-2.5 text-right">
                          <select className="text-xs border border-gray-200 rounded-lg px-2 py-0.5">
                            <option>Broad</option><option>Phrase</option><option>Exact</option>
                          </select>
                        </td>
                        <td className="py-2.5 text-right">
                          <input type="number" defaultValue={Math.floor(Math.random() * 8 + 2)} min={1}
                            className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-0.5 text-right" />
                        </td>
                        <td className="py-2.5 text-right text-gray-600">{Math.floor(Math.random() * 50 + 10)}</td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => setCampaigns(cs => cs.map(c => c.id === selectedCampaign.id
                            ? { ...c, keywords: c.keywords?.filter((_, j) => j !== i) } : c))}
                            className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 p-3 bg-violet-50 rounded-xl text-xs text-violet-700">
                  <strong>Suggested keywords based on product:</strong>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['wireless earbuds nepal', 'best earphones 2026', 'bluetooth headset under 5000', 'anc earbuds', 'tws earphones'].map(kw => (
                      <button key={kw} onClick={() => {
                        setCampaigns(cs => cs.map(c => c.id === selectedCampaign.id
                          ? { ...c, keywords: [...(c.keywords || []), kw] } : c))
                        toast.success(`"${kw}" added`)
                      }}
                        className="bg-violet-100 hover:bg-violet-200 text-violet-800 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors">
                        + {kw}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiTarget className="text-3xl mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Auto campaigns use AI to find keywords automatically.</p>
                <p className="text-xs mt-1 text-gray-400">Switch to Manual targeting to manage keywords.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Daily Clicks (last 30 days)</h2>
              <span className="text-xs text-gray-400">Total: {DAILY_DATA.reduce((a, b) => a + b, 0).toLocaleString()}</span>
            </div>
            <LineChart data={DAILY_DATA} color="#7c3aed" height={100} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              <span>May 11</span><span>May 20</span><span>Jun 1</span><span>Jun 10</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Daily Revenue</h3>
              <LineChart data={DAILY_DATA.map(v => v * 320)} color="#10b981" height={80} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Daily Orders</h3>
              <LineChart data={DAILY_DATA.map(v => Math.round(v * 0.08))} color="#f59e0b" height={80} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Campaign Comparison</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 border-b">
                <th className="py-2 text-left">Campaign</th>
                <th className="py-2 text-right">Spend</th>
                <th className="py-2 text-right">Revenue</th>
                <th className="py-2 text-right">ACoS</th>
                <th className="py-2 text-right">ROAS</th>
                <th className="py-2 text-right">Orders</th>
                <th className="py-2 text-right">CPC</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(c => {
                  const cAcos = c.revenue ? ((c.spent / c.revenue) * 100).toFixed(1) : '—'
                  const cRoas = c.spent ? (c.revenue / c.spent).toFixed(2) : '—'
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-900 line-clamp-1 max-w-[160px]">{c.productTitle}</td>
                      <td className="py-2.5 text-right">Rs.{c.spent.toLocaleString()}</td>
                      <td className="py-2.5 text-right">Rs.{c.revenue.toLocaleString()}</td>
                      <td className={`py-2.5 text-right font-bold ${parseFloat(cAcos) > 30 ? 'text-red-600' : 'text-green-600'}`}>{cAcos}%</td>
                      <td className={`py-2.5 text-right font-bold ${parseFloat(cRoas) < 2 ? 'text-amber-600' : 'text-green-600'}`}>{cRoas}×</td>
                      <td className="py-2.5 text-right">{c.orders}</td>
                      <td className="py-2.5 text-right">Rs.{c.cpc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create campaign modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-auto">
            <h2 className="font-black text-gray-900 text-lg mb-4">Create Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Campaign type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'auto', label: '⚡ Automatic', desc: 'AI picks keywords for you' },
                    { type: 'manual', label: '🎯 Manual', desc: 'You choose exact keywords' },
                  ].map(o => (
                    <div key={o.type} className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-violet-400 transition-colors">
                      <p className="text-sm font-bold text-gray-900">{o.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{o.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Daily budget (Rs.)</label>
                <input type="number" defaultValue={500} min={100} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Default bid per click (Rs.)</label>
                <input type="number" defaultValue={5} min={1} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Start date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">End date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setShowCreate(false); toast.success('Campaign created!') }}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                Launch Campaign
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
