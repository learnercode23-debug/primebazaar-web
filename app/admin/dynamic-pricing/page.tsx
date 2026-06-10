'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiDollarSign, FiTrendingUp, FiTrendingDown, FiZap, FiToggleLeft, FiToggleRight, FiAlertCircle } from 'react-icons/fi'
import { formatPrice } from '@/lib/utils'

interface PricingRule {
  _id: string
  key: string
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
  type: string
  sellerName: string
}

export default function DynamicPricingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rules, setRules] = useState<PricingRule[]>([])
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, router])

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/admin/dynamic-pricing')
      setRules(r.data.data.rules || [])
      setSuggestions(r.data.data.suggestions || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  async function toggleRule(key: string, current: boolean) {
    setRules(r => r.map(rule => rule.key === key ? { ...rule, enabled: !current } : rule))
    try {
      await axios.patch('/api/admin/dynamic-pricing', { key, enabled: !current })
      toast.success(current ? 'Rule disabled' : 'Rule enabled')
      load() // re-generate suggestions for the new rule set
    } catch {
      setRules(r => r.map(rule => rule.key === key ? { ...rule, enabled: current } : rule)) // revert
      toast.error('Failed to update rule')
    }
  }

  async function applyPrice(s: PricingSuggestion) {
    try {
      await axios.post('/api/admin/dynamic-pricing', { productId: s.productId, suggestedPrice: s.suggestedPrice })
      setApplied(prev => { const next = new Set(prev); next.add(s.productId); return next })
      toast.success('Price applied — seller notified')
    } catch { toast.error('Failed to apply price') }
  }

  async function applyAll() {
    const pending = suggestions.filter(s => !applied.has(s.productId))
    if (pending.length === 0) return
    try {
      await Promise.all(pending.map(s => axios.post('/api/admin/dynamic-pricing', { productId: s.productId, suggestedPrice: s.suggestedPrice })))
      setApplied(new Set(suggestions.map(s => s.productId)))
      toast.success(`${pending.length} prices applied`)
    } catch { toast.error('Some prices failed to apply') }
  }

  const typeBadge = (type: string) => ({
    competitor: 'bg-blue-100 text-blue-700',
    demand: 'bg-amber-100 text-amber-700',
    time: 'bg-purple-100 text-purple-700',
    inventory: 'bg-red-100 text-red-700',
  }[type] || 'bg-gray-100 text-gray-600')

  if (!user || loading) return <LoadingSpinner fullPage />

  const pendingCount = suggestions.filter(s => !applied.has(s.productId)).length

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
                <div key={rule.key} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadge(rule.type)}`}>{rule.type}</span>
                      <p className="font-semibold text-gray-900 text-sm mt-1">{rule.name}</p>
                    </div>
                    <button onClick={() => toggleRule(rule.key, rule.enabled)} className="flex-shrink-0 mt-1">
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
              <p className="text-xs text-amber-800">Applying a suggestion updates the product&apos;s live price immediately and sends the seller a notification of the change.</p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">AI Suggestions ({pendingCount} pending)</h2>
              {pendingCount > 0 && (
                <button onClick={applyAll} className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 py-1.5 rounded-full">Apply All</button>
              )}
            </div>
            {suggestions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiDollarSign className="text-5xl mx-auto mb-3 opacity-40" />
                <p className="font-semibold">No pricing suggestions right now</p>
                <p className="text-sm mt-1">Enable more rules, or check back as products gain sales and stock changes.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {suggestions.map(s => {
                  const isApplied = applied.has(s.productId)
                  return (
                    <div key={s.productId} className={`p-4 ${isApplied ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.sellerName}</p>
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
                        <button onClick={() => applyPrice(s)}
                          className="mt-3 w-full text-xs bg-gray-900 hover:bg-gray-700 text-white font-bold py-2 rounded-xl transition-colors">
                          Apply Suggestion → Notify Seller
                        </button>
                      ) : (
                        <p className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Price applied &amp; seller notified</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
