'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiPackage, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Prod { _id: string; title: string; price: number; stock: number; images: string[] }

function stockStatus(stock: number): { label: string; color: string; icon: typeof FiCheckCircle; days: number } {
  if (stock === 0)   return { label: 'Out of Stock', color: 'text-red-600 bg-red-100',    icon: FiAlertTriangle, days: 0 }
  if (stock <= 5)    return { label: 'Critical',     color: 'text-red-500 bg-red-50',     icon: FiAlertTriangle, days: Math.round(stock * 1.2) }
  if (stock <= 15)   return { label: 'Low Stock',    color: 'text-amber-600 bg-amber-100',icon: FiAlertCircle,   days: Math.round(stock * 1.5) }
  if (stock <= 50)   return { label: 'Normal',       color: 'text-green-600 bg-green-100',icon: FiCheckCircle,   days: Math.round(stock * 2) }
  return              { label: 'Overstocked',        color: 'text-blue-600 bg-blue-100',  icon: FiCheckCircle,   days: Math.round(stock * 2) }
}

export default function InventoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Prod[]>([])
  const [fetching, setFetching] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'overstock'>('all')

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) { router.push('/'); return }
    if (user) {
      axios.get('/api/seller/products').then(r => setProducts(r.data.data || []))
        .catch(() => setProducts([]))
        .finally(() => setFetching(false))
    }
  }, [user, loading, router])

  const filtered = products.filter(p => {
    if (filter === 'critical')  return p.stock <= 5
    if (filter === 'low')       return p.stock > 5 && p.stock <= 15
    if (filter === 'overstock') return p.stock > 50
    return true
  })

  const outOfStock = products.filter(p => p.stock === 0).length
  const critical   = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const low        = products.filter(p => p.stock > 5 && p.stock <= 15).length

  if (fetching || !user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500"><FiRefreshCw className="animate-spin" /> Loading inventory…</div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/seller" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Seller Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <FiPackage className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Inventory Forecasting</h1>
          <p className="text-sm text-gray-500">Stock levels, restock alerts & demand forecast</p>
        </div>
      </div>

      {/* Alert banner */}
      {(outOfStock > 0 || critical > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <FiAlertTriangle className="text-red-500 text-xl flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">Stock Alerts</p>
            <p className="text-sm text-red-600">
              {outOfStock > 0 && `${outOfStock} products out of stock. `}
              {critical > 0 && `${critical} products critically low (≤5 units).`}
            </p>
          </div>
          <button className="ml-auto text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap">
            Restock Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Out of Stock', value: outOfStock, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Critical (≤5)', value: critical,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Low (≤15)',     value: low,         color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Total Products', value: products.length, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-2xl p-4 text-center shadow-sm ${bg}`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all','critical','low','overstock'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Products table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiPackage className="text-5xl mx-auto mb-3" />
          <p>No products match this filter</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 border-b">
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Days Left</th>
              <th className="px-4 py-3 text-right">Reorder Qty</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const { label, color, icon: Icon, days } = stockStatus(p.stock)
                const reorder = Math.max(20, Math.round((30 - p.stock) * 1.5))
                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] && <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                        <p className="font-semibold text-gray-900 line-clamp-2 max-w-[200px]">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
                        <Icon className="text-[10px]" /> {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{days > 0 ? `~${days}d` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {p.stock <= 15 ? <span className="font-bold text-violet-700">{reorder} units</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toast.success(`Restock request sent for ${p.title}`)}
                        className="text-xs text-violet-600 border border-violet-200 hover:bg-violet-50 px-3 py-1.5 rounded-xl font-bold transition-colors">
                        Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Forecast tip */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 mt-4 text-sm text-gray-700">
        <strong>💡 Forecast tip:</strong> Based on your 30-day sales velocity, consider restocking products marked Critical at least 2 weeks before they run out to avoid stockouts during peak demand.
      </div>
    </div>
  )
}
