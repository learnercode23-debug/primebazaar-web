'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { FiDollarSign, FiPackage, FiCheck, FiClock, FiX, FiRefreshCw } from 'react-icons/fi'

interface CODOrder {
  _id: string; orderNumber: string; status: string; createdAt: string
  totalAmount: number; codFee: number; codCollected: boolean
  codCollectedAmount?: number; codRemittanceStatus: string
  user: { name: string; phone?: string }
  items: Array<{ title: string; quantity: number; price: number }>
}
interface Counts { total:number; pending:number; collected:number; remitted:number; refused:number }

const STATUS_COLOR: Record<string, string> = {
  confirmed:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700',
  packed:'bg-purple-100 text-purple-700', shipped:'bg-indigo-100 text-indigo-700',
  out_for_delivery:'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700',
  refused:'bg-red-100 text-red-700', cancelled:'bg-gray-100 text-gray-600',
}
const REMIT_LABEL: Record<string, { label:string; color:string }> = {
  pending:        { label:'Awaiting Remittance', color:'text-yellow-600' },
  remitted:       { label:'Cash Remitted ✓',     color:'text-green-600' },
  not_applicable: { label:'Not Applicable',      color:'text-gray-400'  },
}

export default function SellerCODOrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [orders, setOrders]   = useState<CODOrder[]>([])
  const [counts, setCounts]   = useState<Counts>({ total:0, pending:0, collected:0, remitted:0, refused:0 })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'seller' && user.role !== 'admin') { router.push('/'); return }
  }, [user, authLoading, router])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/seller/cod-orders?page=${page}`)
      setOrders(res.data.data || [])
      setTotal(res.data.total || 0)
      setCounts(res.data.counts || { total:0, pending:0, collected:0, remitted:0, refused:0 })
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { if (user?.role === 'seller' || user?.role === 'admin') fetchOrders() }, [fetchOrders, user])

  if (authLoading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My COD Orders</h1>
          <p className="text-sm text-gray-500">Cash on Delivery orders — collection &amp; settlement status</p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <FiRefreshCw className="text-xs"/>Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label:'Total COD',       value: counts.total,     icon: FiPackage,   color:'bg-blue-50 text-blue-700 border-blue-200' },
          { label:'Pending Payment', value: counts.pending,   icon: FiClock,     color:'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label:'Cash Collected',  value: counts.collected, icon: FiCheck,     color:'bg-green-50 text-green-700 border-green-200' },
          { label:'Remitted',        value: counts.remitted,  icon: FiDollarSign,color:'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label:'Refused',         value: counts.refused,   icon: FiX,         color:'bg-red-50 text-red-700 border-red-200' },
        ].map(s=>(
          <div key={s.label} className={`border rounded-xl p-3 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1"><s.icon className="text-base"/><p className="text-xl font-black">{s.value}</p></div>
            <p className="text-xs font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiPackage className="text-4xl mx-auto mb-2"/>
            <p>No COD orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Order','Customer','Items','COD Amount','Collection','Settlement'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order=>(
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[order.status]||'bg-gray-100 text-gray-600'}`}>
                        {order.status.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{order.user?.name}</p>
                      <p className="text-xs text-gray-400">{order.user?.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {order.items.slice(0,2).map((item,i)=>(
                        <p key={i} className="text-xs text-gray-700 truncate max-w-[140px]">{item.quantity}× {item.title}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-900">Rs.{order.totalAmount.toLocaleString()}</p>
                      {order.codFee>0 && <p className="text-[10px] text-gray-400">+ Rs.{order.codFee} COD fee</p>}
                    </td>
                    <td className="px-4 py-3">
                      {order.codCollected ? (
                        <div>
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><FiCheck className="text-xs"/>Collected</span>
                          <p className="text-[10px] text-gray-400">Rs.{order.codCollectedAmount?.toLocaleString()}</p>
                        </div>
                      ) : order.status === 'refused' ? (
                        <span className="flex items-center gap-1 text-xs text-red-500"><FiX className="text-xs"/>Refused</span>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1"><FiClock className="text-xs"/>Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${REMIT_LABEL[order.codRemittanceStatus]?.color||'text-gray-400'}`}>
                        {REMIT_LABEL[order.codRemittanceStatus]?.label || order.codRemittanceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {Math.ceil(total/20) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total/20)}</p>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1 rounded border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-40">Prev</button>
              <button onClick={()=>setPage(p=>Math.min(Math.ceil(total/20),p+1))} disabled={page===Math.ceil(total/20)}
                className="px-3 py-1 rounded border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
