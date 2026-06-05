'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiRefreshCw, FiCheck, FiUsers, FiDollarSign, FiUnlock } from 'react-icons/fi'

interface Collection {
  _id: string; orderNumber: string; status: string
  totalAmount: number; codFee: number; codCollectedAmount?: number; codCollectedAt?: string
  deliveryCodeLocked: boolean; deliveryCodeAttempts: number
  user: { name: string; email: string; phone?: string }
  deliveryCodeCollectedBy: { name: string; email: string } | null
}
interface AgentSummary { id: string; name: string; email: string; count: number; total: number }

export default function CODCollectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [collections,   setCollections]  = useState<Collection[]>([])
  const [agentSummary,  setAgentSummary] = useState<AgentSummary[]>([])
  const [totalCollected,setTotalCollected]= useState(0)
  const [loading,       setLoading]      = useState(true)
  const [unlocking,     setUnlocking]    = useState<string|null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/cod-collections')
      setCollections(res.data.data?.orders || [])
      setAgentSummary(res.data.data?.agentSummary || [])
      setTotalCollected(res.data.data?.totalCollected || 0)
    } catch { toast.error('Failed to load collections') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData()
      // Live updates every 15s
      const t = setInterval(fetchData, 15000)
      return () => clearInterval(t)
    }
  }, [fetchData, user])

  async function unlockCode(orderId: string) {
    setUnlocking(orderId)
    try {
      await axios.post(`/api/admin/cod/${orderId}/unlock-code`, { regenerate: true })
      toast.success('Code unlocked and regenerated')
      fetchData()
    } catch { toast.error('Unlock failed') }
    finally  { setUnlocking(null) }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">COD Collections</h1>
          <p className="text-sm text-gray-500">Real-time delivery verification &amp; cash collection report</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <FiRefreshCw className="text-xs"/> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <FiDollarSign className="text-green-600 text-xl mb-1"/>
          <p className="text-2xl font-black text-green-700">Rs.{totalCollected.toLocaleString()}</p>
          <p className="text-sm text-green-600">Total Cash Collected</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <FiCheck className="text-blue-600 text-xl mb-1"/>
          <p className="text-2xl font-black text-blue-700">{collections.length}</p>
          <p className="text-sm text-blue-600">Deliveries Completed</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <FiUsers className="text-purple-600 text-xl mb-1"/>
          <p className="text-2xl font-black text-purple-700">{agentSummary.length}</p>
          <p className="text-sm text-purple-600">Active Agents</p>
        </div>
      </div>

      {/* Per-Agent Summary */}
      {agentSummary.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-900">Cash Collected per Agent</h2>
          </div>
          <div className="divide-y">
            {agentSummary.map(agent => (
              <div key={agent.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{agent.name}</p>
                  <p className="text-xs text-gray-400">{agent.email} · {agent.count} deliveries</p>
                </div>
                <p className="font-bold text-green-600">Rs.{Math.round(agent.total).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Delivery Log</h2>
          <p className="text-xs text-gray-400">Auto-refreshes every 15s</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No collections yet.</p>
            <p className="text-sm mt-1">Go to /admin/cod → Seed Demo Data → /delivery → complete a delivery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Order','Customer','Agent','Amount','Collected At','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collections.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-gray-900">#{c.orderNumber}</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Delivered</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{c.user?.name}</p>
                      <p className="text-xs text-gray-400">{c.user?.phone || c.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{c.deliveryCodeCollectedBy?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{c.deliveryCodeCollectedBy?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-green-700">Rs.{(c.codCollectedAmount || c.totalAmount).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">
                        {c.codCollectedAt ? new Date(c.codCollectedAt).toLocaleString() : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {c.deliveryCodeLocked && (
                        <button
                          onClick={() => unlockCode(c._id)}
                          disabled={unlocking === c._id}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-60"
                        >
                          <FiUnlock className="text-xs"/> Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
