'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatDate, formatPrice } from '@/lib/utils'

interface ReturnReq {
  _id: string
  returnNumber: string
  status: string
  reason: string
  refundAmount: number
  createdAt: string
  user: { name: string; email: string }
  order: { orderNumber: string; totalAmount: number }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  in_transit: 'bg-purple-100 text-purple-800',
  received: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
}

export default function AdminReturnsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [returns, setReturns] = useState<ReturnReq[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/admin/returns').then((r) => setReturns(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user, router])

  async function updateStatus(id: string, status: string) {
    await axios.put(`/api/admin/returns/${id}`, { status })
    setReturns((p) => p.map((r) => r._id === id ? { ...r, status } : r))
    toast.success(`Return ${status}`)
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Return Requests ({returns.length})</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Return #</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Order #</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Refund</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {returns.map((ret) => (
                <tr key={ret._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{ret.returnNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{ret.user?.name}</p>
                    <p className="text-xs text-gray-500">{ret.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{ret.order?.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize text-xs">{ret.reason?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatPrice(ret.refundAmount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ret.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[ret.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select value={ret.status} onChange={(e) => updateStatus(ret._id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                      {['pending', 'approved', 'rejected', 'in_transit', 'received', 'completed'].map((s) => (
                        <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {returns.length === 0 && <div className="py-12 text-center text-gray-500">No return requests</div>}
        </div>
      </div>
    </div>
  )
}
