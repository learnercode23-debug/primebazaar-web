'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiUsers } from 'react-icons/fi'

const SEGMENT_META: Record<string, { label: string; color: string; desc: string }> = {
  champions:   { label: '🏆 Champions',   color: 'bg-violet-100 border-violet-300 text-violet-800', desc: 'Bought recently, buy often, spent the most' },
  loyal:       { label: '💜 Loyal',        color: 'bg-indigo-100 border-indigo-300 text-indigo-800', desc: 'Regular buyers with high spend' },
  promising:   { label: '🌟 Promising',    color: 'bg-blue-100 border-blue-300 text-blue-800',       desc: 'Recent buyers with growing frequency' },
  at_risk:     { label: '⚠️ At Risk',      color: 'bg-amber-100 border-amber-300 text-amber-800',    desc: 'Used to buy often but becoming inactive' },
  hibernating: { label: '😴 Hibernating',  color: 'bg-orange-100 border-orange-300 text-orange-800', desc: 'Low spend and infrequent, inactive recently' },
  lost:        { label: '💔 Lost',          color: 'bg-red-100 border-red-300 text-red-800',          desc: 'Lowest RFM scores — likely churned' },
}
const ORDER: string[] = ['champions', 'loyal', 'promising', 'at_risk', 'hibernating', 'lost']
const BAR_COLORS = ['bg-violet-600', 'bg-indigo-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500']

interface SegmentStat { key: string; count: number; avgLTV: number; avgFreq: number; avgRecencyDays: number }
interface Customer { name: string; email: string; segment: string; ltv: number; orders: number; lastDays: number }

function ago(days: number) {
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days >= 90) return '90+ days ago'
  return `${days} days ago`
}

export default function CustomerSegmentationPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [segments, setSegments] = useState<SegmentStat[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/admin/customers')
      .then(r => { setSegments(r.data.data.segments || []); setCustomers(r.data.data.customers || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, router])

  if (!user || loading) return <LoadingSpinner fullPage />

  const totalCustomers = segments.reduce((s, x) => s + x.count, 0)
  const shown = active ? customers.filter(c => c.segment === active) : customers
  const segMeta = active ? SEGMENT_META[active] : null

  function exportCsv() {
    const header = 'Name,Email,Segment,LTV,Orders,LastOrderDays\n'
    const body = shown.map(c => `"${c.name}","${c.email}",${c.segment},${c.ltv},${c.orders},${c.lastDays}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'customer-segments.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FiUsers className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Customer Segmentation</h1>
            <p className="text-sm text-gray-500">RFM (Recency · Frequency · Monetary) — computed from paid orders</p>
          </div>
        </div>
      </div>

      {totalCustomers === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-2xl">
          <FiUsers className="text-5xl mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No customer data yet</p>
          <p className="text-sm mt-1">Segments appear once customers have placed paid orders.</p>
        </div>
      ) : (
        <>
          {/* Segments grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {ORDER.map(key => {
              const s = segments.find(x => x.key === key)
              const meta = SEGMENT_META[key]
              const count = s?.count ?? 0
              return (
                <button key={key} onClick={() => setActive(active === key ? null : key)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${meta.color} ${active === key ? 'ring-2 ring-violet-500 ring-offset-2' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base">{meta.label}</span>
                    <span className="text-2xl font-black">{count.toLocaleString()}</span>
                  </div>
                  <p className="text-xs opacity-80 mb-3">{meta.desc}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="opacity-70">Avg LTV</p><p className="font-bold">Rs.{((s?.avgLTV ?? 0) / 1000).toFixed(0)}K</p></div>
                    <div><p className="opacity-70">Avg orders</p><p className="font-bold">{s?.avgFreq ?? 0}</p></div>
                    <div><p className="opacity-70">Last seen</p><p className="font-bold">{ago(s?.avgRecencyDays ?? 0)}</p></div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Distribution bar */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="font-black text-gray-900">Segment Distribution</p>
              <p className="text-sm text-gray-500">{totalCustomers.toLocaleString()} total customers</p>
            </div>
            <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
              {ORDER.map((key, i) => {
                const count = segments.find(x => x.key === key)?.count ?? 0
                const pct = totalCustomers ? (count / totalCustomers) * 100 : 0
                return <div key={key} className={`${BAR_COLORS[i]} transition-all`} style={{ width: `${pct}%` }} title={`${SEGMENT_META[key].label}: ${count}`} />
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {ORDER.map((key, i) => (
                <span key={key} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${BAR_COLORS[i]}`} />{SEGMENT_META[key].label.split(' ').slice(1).join(' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Customer table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-gray-900">{segMeta ? `${segMeta.label} Customers` : 'All Customers'} <span className="text-gray-400 font-normal">({shown.length})</span></h2>
              <div className="flex items-center gap-3">
                {active && <button onClick={() => setActive(null)} className="text-xs text-gray-400 hover:text-gray-700">Show all</button>}
                <button onClick={exportCsv} className="text-xs text-violet-600 hover:underline font-semibold">Export CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b bg-gray-50"><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Segment</th><th className="px-4 py-3 text-right">LTV</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Last Order</th></tr></thead>
                <tbody>
                  {shown.slice(0, 100).map((c, i) => {
                    const meta = SEGMENT_META[c.segment]
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </td>
                        <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span></td>
                        <td className="px-4 py-3 text-right font-bold">Rs.{c.ltv.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{c.orders}</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{ago(c.lastDays)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
