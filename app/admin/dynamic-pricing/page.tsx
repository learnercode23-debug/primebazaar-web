'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiDollarSign, FiTrendingUp, FiTrendingDown, FiZap, FiToggleLeft, FiToggleRight, FiAlertCircle } from 'react-icons/fi'
import { formatPrice } from '@/lib/utils'

interface PricingRule {
  id: string
  name: string
  type: 'competitor' | 'demand' | 'time' | 'inventory'
  enabled: boolean
  description: string
}

interface PricingSuggestion {
  productId: string
  title: string
  currentPrice: number
  suggestedPrice: number
  reason: string
  change: number
  confidence: number
  category: string
}

const RULES: PricingRule[] = [
  { id: '1', name: 'Demand-Based Surge', type: 'demand', enabled: true, description: 'Increase price up to 15% when product views are 3× above average in 24h' },
  { id: '2', name: 'Low Stock Premium', type: 'inventory', enabled: true, description: 'Apply +10% premium when stock drops below 5 units' },
  { id: '3', name: 'Flash Sale Auto-Discount', type: 'time', enabled: false, description: 'Apply 20% discount on products with no sale in 14 days between 10pm–12am' },
  { id: '4', name: 'Competitor Price Match', type: 'competitor', enabled: false, description: 'Auto-adjust to match market average price ±5% when known competitor price is scraped' },
]

const SUGGESTIONS: PricingSuggestion[] = [
  { productId: '1', title: 'Samsung 65" 4K QLED TV', currentPrice: 145000, suggestedPrice: 152250, reason: 'High demand (+340% views this week)', change: 5, confidence: 88, category: 'Electronics' },
  { productId: '2', title: 'Nike Air Max 270', currentPrice: 12500, suggestedPrice: 11875, reason: 'No sale in 18 days — stimulate demand', change: -5, confidence: 79, category: 'Fashion' },
  { productId: '3', title: 'JBL Bluetooth Speaker', currentPrice: 8900, suggestedPrice: 9790, reason: 'Only 3 units left in stock', change: 10, confidence: 92, category: 'Electronics' },
  { productId: '4', title: 'Cotton T-Shirt (White, XL)', currentPrice: 1200, suggestedPrice: 1080, reason: 'Competitor avg price Rs.1,050', change: -10, confidence: 74, category: 'Fashion' },
  { productId: '5', title: 'Instant Pot Pressure Cooker', currentPrice: 15500, suggestedPrice: 16275, reason: 'Trending category — 3× normal demand', change: 5, confidence: 85, category: 'Home & Garden' },
]

export default function DynamicPricingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rules, setRules] = useState(RULES)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  if (user && user.role !== 'admin') { router.push('/'); return null }

  function toggleRule(id: string) {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule))
    const rule = rules.find(r => r.id === id)
    toast.success(rule?.enabled ? `Rule disabled` : `Rule enabled`)
  }

  function applyPrice(productId: string) {
    setApplied(s => { const next = new Set(s); next.add(productId); return next })
    toast.success('Price update queued for seller approval')
  }

  function applyAll() {
    const ids = new Set(SUGGESTIONS.map(s => s.productId))
    setApplied(ids)
    toast.success(`${SUGGESTIONS.length} price updates queued`)
  }

  const typeBadge = (type: string) => ({
    competitor: 'bg-blue-100 text-blue-700',
    demand: 'bg-amber-100 text-amber-700',
    time: 'bg-purple-100 text-purple-700',
    inventory: 'bg-red-100 text-red-700',
  }[type] || 'bg-gray-100 text-gray-600')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiDollarSign className="text-emerald-500 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing AI</h1>
          <p className="text-sm text-gray-500">AI-powered pricing suggestions based on demand, inventory, and competitors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2"><FiZap className="text-amber-500" /> Pricing Rules</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {rules.map(rule => (
                <div key={rule.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadge(rule.type)}`}>{rule.type}</span>
                      <p className="font-semibold text-gray-900 text-sm mt-1">{rule.name}</p>
                    </div>
                    <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0 mt-1">
                      {rule.enabled
                        ? <FiToggleRight className="text-2xl text-green-600" />
                        : <FiToggleLeft className="text-2xl text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">Price changes require seller confirmation before going live. Sellers receive a notification to approve or reject each suggestion.</p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">AI Suggestions ({SUGGESTIONS.filter(s => !applied.has(s.productId)).length} pending)</h2>
              {SUGGESTIONS.some(s => !applied.has(s.productId)) && (
                <button onClick={applyAll} className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 py-1.5 rounded-full">Apply All</button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {SUGGESTIONS.map(s => {
                const isApplied = applied.has(s.productId)
                return (
                  <div key={s.productId} className={`p-4 ${isApplied ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.category}</p>
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          {s.change > 0 ? <FiTrendingUp className="text-green-500" /> : <FiTrendingDown className="text-red-500" />}
                          {s.reason}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 line-through">{formatPrice(s.currentPrice)}</p>
                        <p className={`font-black text-base ${s.change > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPrice(s.suggestedPrice)}</p>
                        <p className={`text-xs font-bold ${s.change > 0 ? 'text-green-600' : 'text-red-500'}`}>{s.change > 0 ? '+' : ''}{s.change}%</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.confidence}% confidence</p>
                      </div>
                    </div>
                    {!isApplied ? (
                      <button onClick={() => applyPrice(s.productId)}
                        className="mt-3 w-full text-xs bg-gray-900 hover:bg-gray-700 text-white font-bold py-2 rounded-xl transition-colors">
                        Apply Suggestion → Notify Seller
                      </button>
                    ) : (
                      <p className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Queued for seller approval</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
