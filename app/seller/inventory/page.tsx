'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiPackage, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiTrendingUp } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Prod { _id: string; title: string; price: number; stock: number; images: string[]; salesCount?: number }

type ABCClass = 'A' | 'B' | 'C'

function stockStatus(stock: number): { label: string; color: string; icon: typeof FiCheckCircle; days: number } {
  if (stock === 0)   return { label: 'Out of Stock', color: 'text-red-600 bg-red-100',     icon: FiAlertTriangle, days: 0 }
  if (stock <= 5)    return { label: 'Critical',     color: 'text-red-500 bg-red-50',      icon: FiAlertTriangle, days: Math.round(stock * 1.2) }
  if (stock <= 15)   return { label: 'Low Stock',    color: 'text-amber-600 bg-amber-100', icon: FiAlertCircle,   days: Math.round(stock * 1.5) }
  if (stock <= 50)   return { label: 'Normal',       color: 'text-green-600 bg-green-100', icon: FiCheckCircle,   days: Math.round(stock * 2) }
  return               { label: 'Overstocked',       color: 'text-blue-600 bg-blue-100',   icon: FiCheckCircle,   days: Math.round(stock * 2) }
}

function abcClass(salesCount: number, allSales: number[]): ABCClass {
  const sorted = [...allSales].sort((a, b) => b - a)
  const top20pct = sorted[Math.floor(sorted.length * 0.2)] ?? 0
  const top50pct = sorted[Math.floor(sorted.length * 0.5)] ?? 0
  if (salesCount >= top20pct) return 'A'
  if (salesCount >= top50pct) return 'B'
  return 'C'
}

const ABC_COLORS: Record<ABCClass, string> = {
  A: 'bg-violet-600 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-gray-400 text-white',
}

function DemandForecastChart({ stock, salesCount }: { stock: number; salesCount: number }) {
  const dailyVelocity = Math.max(0.3, salesCount / 90)
  const days = Array.from({ length: 90 }, (_, i) => i + 1)

  const optimistic  = days.map(d => Math.max(0, stock - dailyVelocity * 0.7 * d))
  const realistic   = days.map(d => Math.max(0, stock - dailyVelocity * d))
  const pessimistic = days.map(d => Math.max(0, stock - dailyVelocity * 1.4 * d))

  const W = 400; const H = 120; const pad = 8
  const maxY = stock || 1
  const toX = (i: number) => pad + (i / 89) * (W - pad * 2)
  const toY = (v: number) => H - pad - (v / maxY) * (H - pad * 2)

  function line(vals: number[], color: string, dash = '') {
    const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
    return <path key={color} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray={dash} />
  }

  const stockoutDay = realistic.findIndex(v => v === 0)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><FiTrendingUp className="text-violet-500" /> 90-Day Demand Forecast</h3>
        {stockoutDay > 0 && (
          <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full">
            Stockout in ~{stockoutDay}d
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
        {/* Stockout line */}
        {stockoutDay > 0 && <line x1={toX(stockoutDay)} y1={pad} x2={toX(stockoutDay)} y2={H - pad} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />}
        {line(optimistic,  '#a78bfa', '4 3')}
        {line(pessimistic, '#fca5a5', '4 3')}
        {line(realistic,   '#7c3aed')}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 bg-violet-600" /> Realistic</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 bg-violet-300" style={{ borderTop: '1px dashed #a78bfa' }} /> Optimistic</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 bg-red-300" style={{ borderTop: '1px dashed #fca5a5' }} /> Pessimistic</span>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Prod[]>([])
  const [fetching, setFetching] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'overstock' | 'A' | 'B' | 'C'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Prod | null>(null)
  const [tab, setTab] = useState<'table' | 'abc' | 'forecast'>('table')

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) { router.push('/'); return }
    if (user) {
      axios.get('/api/seller/products').then(r => setProducts(r.data.data || []))
        .catch(() => setProducts([]))
        .finally(() => setFetching(false))
    }
  }, [user, loading, router])

  const allSales = products.map(p => p.salesCount ?? 0)

  const filtered = products.filter(p => {
    if (filter === 'critical')  return p.stock <= 5
    if (filter === 'low')       return p.stock > 5 && p.stock <= 15
    if (filter === 'overstock') return p.stock > 50
    if (filter === 'A' || filter === 'B' || filter === 'C')
      return abcClass(p.salesCount ?? 0, allSales) === filter
    return true
  })

  const outOfStock = products.filter(p => p.stock === 0).length
  const critical   = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const low        = products.filter(p => p.stock > 5 && p.stock <= 15).length
  const aItems     = products.filter(p => abcClass(p.salesCount ?? 0, allSales) === 'A').length
  const totalInventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0)

  if (fetching || !user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500"><FiRefreshCw className="animate-spin" /> Loading inventory…</div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link href="/seller" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Seller Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <FiPackage className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Advanced Inventory Forecasting</h1>
          <p className="text-sm text-gray-500">Demand forecast · ABC analysis · Safety stock · Reorder intelligence</p>
        </div>
      </div>

      {(outOfStock > 0 || critical > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <FiAlertTriangle className="text-red-500 text-xl flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">Stock Alerts</p>
            <p className="text-sm text-red-600">
              {outOfStock > 0 && `${outOfStock} products out of stock. `}
              {critical > 0 && `${critical} critically low (≤5 units).`}
            </p>
          </div>
          <button className="ml-auto text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap">
            Bulk Restock
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Out of Stock', value: outOfStock,   color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
          { label: 'Critical (≤5)', value: critical,    color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Low (≤15)',     value: low,          color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
          { label: 'A-Class Items', value: aItems,       color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Inventory Value', value: `Rs.${(totalInventoryValue/1000).toFixed(0)}K`, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-2xl p-3 text-center shadow-sm ${bg}`}>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-600 font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'table', label: 'Inventory Table' },
          { key: 'abc', label: 'ABC Analysis' },
          { key: 'forecast', label: 'Demand Forecast' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tab === key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'table' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all','critical','low','overstock','A','B','C'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
                {f === 'all' ? 'All' : f === 'A' ? 'A-Class' : f === 'B' ? 'B-Class' : f === 'C' ? 'C-Class' : f}
              </button>
            ))}
          </div>

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
                  <th className="px-3 py-3 text-center">ABC</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Days Left</th>
                  <th className="px-4 py-3 text-right">Safety Stock</th>
                  <th className="px-4 py-3 text-right">Reorder Point</th>
                  <th className="px-4 py-3 text-right">Reorder Qty</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => {
                    const { label, color, icon: Icon, days } = stockStatus(p.stock)
                    const dailyVelocity = Math.max(0.1, (p.salesCount ?? 1) / 90)
                    const leadTime = 7
                    const safetyStock = Math.ceil(dailyVelocity * leadTime * 0.5)
                    const reorderPoint = Math.ceil(dailyVelocity * leadTime + safetyStock)
                    const reorderQty = Math.max(20, Math.round(dailyVelocity * 30 * 1.2))
                    const cls = abcClass(p.salesCount ?? 0, allSales)
                    return (
                      <tr key={p._id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedProduct(p === selectedProduct ? null : p)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images[0] && <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                            <p className="font-semibold text-gray-900 line-clamp-1 max-w-[180px]">{p.title}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${ABC_COLORS[cls]}`}>{cls}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-900">{p.stock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
                            <Icon className="text-[10px]" /> {label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{days > 0 ? `~${days}d` : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{safetyStock}</td>
                        <td className="px-4 py-3 text-right">
                          {p.stock <= reorderPoint
                            ? <span className="text-red-600 font-bold">{reorderPoint} ⚠</span>
                            : <span className="text-gray-500">{reorderPoint}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.stock <= reorderPoint ? <span className="font-bold text-violet-700">{reorderQty}</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={e => { e.stopPropagation(); toast.success(`Restock request sent for ${p.title}`) }}
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

          {selectedProduct && (
            <DemandForecastChart stock={selectedProduct.stock} salesCount={selectedProduct.salesCount ?? 5} />
          )}
        </>
      )}

      {tab === 'abc' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            {(['A','B','C'] as ABCClass[]).map(cls => {
              const items = products.filter(p => abcClass(p.salesCount ?? 0, allSales) === cls)
              const value = items.reduce((s, p) => s + p.price * p.stock, 0)
              const descs: Record<ABCClass, string> = {
                A: 'Top 20% by sales velocity — highest priority. Never let these stockout.',
                B: 'Middle tier — moderate monitoring and 2-week safety stock.',
                C: 'Slow movers — minimal safety stock, consider discounting.',
              }
              return (
                <div key={cls} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xl font-black px-3 py-1 rounded-full ${ABC_COLORS[cls]}`}>{cls}</span>
                    <div>
                      <p className="font-bold text-gray-900">{items.length} products</p>
                      <p className="text-xs text-gray-500">Rs.{(value/1000).toFixed(1)}K value</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{descs[cls]}</p>
                  <div className="space-y-1.5">
                    {items.slice(0, 5).map(p => (
                      <div key={p._id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate max-w-[160px]">{p.title}</span>
                        <span className="font-bold text-gray-900 ml-2">{p.stock} units</span>
                      </div>
                    ))}
                    {items.length > 5 && <p className="text-xs text-gray-400">+{items.length - 5} more</p>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-2">ABC Analysis Methodology</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-xs text-gray-600">
              <div><strong className="text-violet-700">A Items (top 20%):</strong> Check stock daily. Safety stock = 2× lead time demand. Never drop below reorder point.</div>
              <div><strong className="text-blue-700">B Items (middle 30%):</strong> Weekly review. Safety stock = 1× lead time demand. Reorder when below 2 weeks supply.</div>
              <div><strong className="text-gray-600">C Items (bottom 50%):</strong> Monthly review. Minimal safety stock. Consider clearance if no sales in 60d.</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="space-y-4">
          {products.slice(0, 6).map(p => (
            <DemandForecastChart key={p._id} stock={p.stock} salesCount={p.salesCount ?? 5} />
          ))}
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FiPackage className="text-5xl mx-auto mb-3" />
              <p>No products found. Add products to see forecasts.</p>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Safety Stock Formula</h3>
            <div className="bg-gray-50 rounded-xl p-3 font-mono text-sm text-gray-700 mb-3">
              Safety Stock = Z × σ_demand × √lead_time
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Z</strong> = service level factor (1.65 for 95%, 2.05 for 98%)</p>
              <p><strong>σ_demand</strong> = standard deviation of daily demand</p>
              <p><strong>lead_time</strong> = supplier lead time in days (default 7d)</p>
              <p className="pt-1 text-violet-700 font-semibold">Reorder Point = (avg daily demand × lead time) + safety stock</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
