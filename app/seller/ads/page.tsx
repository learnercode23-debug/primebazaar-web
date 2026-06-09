'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiPlus, FiZap, FiTrendingUp, FiEye, FiMousePointer, FiPause, FiPlay, FiTrash2 } from 'react-icons/fi'

interface Campaign {
  id: string
  productTitle: string
  productImage: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  status: 'active' | 'paused' | 'ended'
  startDate: string
  endDate: string
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', productTitle: 'Wireless Earbuds Pro X', productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100',
    budget: 2000, spent: 1240, impressions: 18400, clicks: 342, status: 'active', startDate: '2026-06-01', endDate: '2026-06-15',
  },
  {
    id: 'c2', productTitle: 'Smart Watch Series 4', productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100',
    budget: 1500, spent: 1500, impressions: 12300, clicks: 198, status: 'ended', startDate: '2026-05-15', endDate: '2026-05-31',
  },
  {
    id: 'c3', productTitle: 'USB-C Hub 7-in-1', productImage: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100',
    budget: 800, spent: 120, impressions: 2100, clicks: 41, status: 'paused', startDate: '2026-06-05', endDate: '2026-06-20',
  },
]

export default function SellerAdsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all')

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) router.push('/')
  }, [user, loading, router])

  if (loading || !user) return null

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const avgCtr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'

  function toggleStatus(id: string) {
    setCampaigns(cs => cs.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiZap className="text-violet-600" /> Sponsored Ads</h1>
          <p className="text-sm text-gray-500">Boost your products to reach more customers</p>
        </div>
        <Link href="/seller/ads/new" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md">
          <FiPlus /> Create Campaign
        </Link>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: FiZap,         label: 'Total spent',    value: `Rs.${totalSpent.toLocaleString()}` },
          { icon: FiEye,         label: 'Impressions',    value: totalImpressions.toLocaleString() },
          { icon: FiMousePointer,label: 'Clicks',         value: totalClicks.toLocaleString() },
          { icon: FiTrendingUp,  label: 'Avg CTR',        value: `${avgCtr}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <Icon className="text-violet-500 mb-2" />
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'active', 'paused', 'ended'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize ${filter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-4">
        {filtered.map(c => {
          const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
          const budgetPct = Math.min(100, Math.round((c.spent / c.budget) * 100))
          return (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-violet-200 transition-colors">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Product thumb */}
                <img src={c.productImage} alt={c.productTitle} className="w-14 h-14 rounded-xl object-cover border flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{c.productTitle}</p>
                      <p className="text-xs text-gray-400">{c.startDate} → {c.endDate}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' :
                      c.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {c.status === 'active' ? '● ' : ''}{c.status}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {[
                      { label: 'Impressions', value: c.impressions.toLocaleString() },
                      { label: 'Clicks', value: c.clicks.toLocaleString() },
                      { label: 'CTR', value: `${ctr}%` },
                      { label: 'Spent', value: `Rs.${c.spent.toLocaleString()} / Rs.${c.budget.toLocaleString()}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Budget progress */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${budgetPct >= 90 ? 'bg-red-400' : 'bg-violet-500'}`} style={{ width: `${budgetPct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{budgetPct}% of budget used</p>
                  </div>
                </div>

                {/* Actions */}
                {c.status !== 'ended' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleStatus(c.id)}
                      className="w-9 h-9 rounded-xl border border-gray-200 hover:border-violet-300 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"
                      title={c.status === 'active' ? 'Pause' : 'Resume'}>
                      {c.status === 'active' ? <FiPause className="text-sm" /> : <FiPlay className="text-sm" />}
                    </button>
                    <button
                      onClick={() => setCampaigns(cs => cs.filter(x => x.id !== c.id))}
                      className="w-9 h-9 rounded-xl border border-gray-200 hover:border-red-300 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                      title="Delete">
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
            <Link href="/seller/ads/new" className="mt-3 inline-block text-violet-600 hover:underline text-sm font-semibold">Create your first campaign →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
