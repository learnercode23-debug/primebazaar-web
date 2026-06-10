'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiAlertTriangle, FiPackage, FiBell, FiSliders } from 'react-icons/fi'

interface LowStockProduct {
  _id: string
  title: string
  images: string[]
  stock: number
  price: number
  brand: string
  seller: { _id: string; name: string; email: string }
  category: { name: string }
}

export default function InventoryAlertsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(10)
  const [notifying, setNotifying] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, router, threshold])

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get(`/api/admin/inventory-alerts?threshold=${threshold}`)
      setProducts(r.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  async function notifySeller(productId: string, sellerId: string) {
    setNotifying(productId)
    try {
      await axios.post('/api/admin/inventory-alerts', { productId, sellerId })
      toast.success('Seller notified!')
    } catch { toast.error('Failed to send notification') }
    finally { setNotifying(null) }
  }

  const critical = products.filter(p => p.stock === 0)
  const low = products.filter(p => p.stock > 0 && p.stock <= 5)
  const warning = products.filter(p => p.stock > 5)

  if (!user) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiAlertTriangle className="text-amber-500 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
          <p className="text-sm text-gray-500">Products running low on stock</p>
        </div>
      </div>

      {/* Threshold control */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
        <FiSliders className="text-gray-500" />
        <label className="text-sm font-semibold text-gray-700">Alert threshold: <span className="text-violet-600 font-bold">{threshold} units</span></label>
        <input type="range" min={1} max={50} value={threshold} onChange={e => setThreshold(+e.target.value)} className="flex-1 max-w-xs accent-violet-600" />
        <div className="flex gap-3 text-sm font-semibold">
          <span className="text-red-600">{critical.length} out of stock</span>
          <span className="text-amber-600">{low.length} critical (&le;5)</span>
          <span className="text-yellow-600">{warning.length} low</span>
        </div>
      </div>

      {loading ? <LoadingSpinner fullPage /> : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiPackage className="text-5xl mx-auto mb-3 opacity-40" />
          <p className="font-semibold">All products are well-stocked</p>
          <p className="text-sm mt-1">No products below {threshold} units</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Product', 'Category', 'Seller', 'Price', 'Stock', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const level = p.stock === 0 ? 'out' : p.stock <= 5 ? 'critical' : 'low'
                const badge = level === 'out' ? 'bg-red-100 text-red-700' : level === 'critical' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                const label = level === 'out' ? 'Out of stock' : level === 'critical' ? `${p.stock} left` : `${p.stock} left`
                return (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg border" />}
                        <div>
                          <Link href={`/products/${p._id}`} className="font-medium text-gray-900 hover:text-violet-600 line-clamp-1">{p.title}</Link>
                          <p className="text-xs text-gray-400">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category?.name}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.seller?.name}</p>
                      <p className="text-xs text-gray-400">{p.seller?.email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => notifySeller(p._id, p.seller._id)}
                        disabled={notifying === p._id}
                        className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-full font-semibold transition-colors"
                      >
                        <FiBell className="text-xs" />
                        {notifying === p._id ? 'Sending…' : 'Notify Seller'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
