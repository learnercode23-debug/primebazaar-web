'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiZap, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'

interface Product { _id: string; title: string; images: string[]; price: number }

const BUDGETS = [
  { amount: 500,  label: 'Starter',     reach: '~2,000 people' },
  { amount: 1000, label: 'Growth',      reach: '~5,000 people' },
  { amount: 2000, label: 'Accelerate',  reach: '~12,000 people' },
  { amount: 5000, label: 'Dominate',    reach: '~35,000 people' },
]
const DURATIONS = [3, 7, 14, 30]

export default function NewCampaignPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [budget, setBudget] = useState(1000)
  const [duration, setDuration] = useState(7)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) router.push('/')
    if (user) {
      axios.get('/api/seller/products').then(r => setProducts(r.data.data || [])).catch(() => {})
    }
  }, [user, loading, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) { toast.error('Select a product to boost'); return }
    setPlacing(true)
    await new Promise(r => setTimeout(r, 900))
    setPlacing(false)
    toast.success('Campaign created! Your product will start appearing as Sponsored.')
    router.push('/seller/ads')
  }

  const dailyBudget = Math.round(budget / duration)
  const selectedBudgetInfo = BUDGETS.find(b => b.amount === budget)

  if (loading || !user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/seller/ads" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <FiArrowLeft /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <FiZap className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Create Sponsored Campaign</h1>
          <p className="text-sm text-gray-500">Boost a product to appear in search results and category pages</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Product selection */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-gray-900 mb-3 text-sm">1. Choose a product to boost</h2>
          {products.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {products.map(p => (
                <button key={p._id} type="button" onClick={() => setSelectedProduct(p._id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedProduct === p._id ? 'border-violet-600 bg-violet-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  {p.images[0] && <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{p.title}</p>
                    <p className="text-xs text-gray-500">Rs.{p.price.toLocaleString()}</p>
                  </div>
                  {selectedProduct === p._id && <span className="text-violet-600 font-black text-sm">✓</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              No products found. <Link href="/seller/products/new" className="text-violet-600 hover:underline">Add a product first</Link>.
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-gray-900 mb-3 text-sm">2. Set your total budget</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {BUDGETS.map(b => (
              <button key={b.amount} type="button" onClick={() => setBudget(b.amount)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${budget === b.amount ? 'border-violet-600 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="font-black text-gray-900 text-base">Rs.{b.amount.toLocaleString()}</p>
                <p className="text-[10px] text-violet-600 font-bold">{b.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{b.reach}</p>
              </button>
            ))}
          </div>
          {selectedBudgetInfo && (
            <p className="text-xs text-gray-500 bg-violet-50 rounded-xl px-3 py-2">
              Estimated reach: <strong className="text-violet-700">{selectedBudgetInfo.reach}</strong> · Appears as <strong>Sponsored</strong> in search and category pages
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-gray-900 mb-3 text-sm">3. Campaign duration</h2>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map(d => (
              <button key={d} type="button" onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${duration === d ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                {d} days
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">≈ Rs.{dailyBudget}/day daily spend</p>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-5">
          <h2 className="font-black mb-3">Campaign summary</h2>
          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between"><span className="text-white/70">Duration</span><span className="font-bold">{duration} days</span></div>
            <div className="flex justify-between"><span className="text-white/70">Daily budget</span><span className="font-bold">Rs.{dailyBudget.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Total budget</span><span className="font-bold">Rs.{budget.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Est. reach</span><span className="font-bold">{selectedBudgetInfo?.reach || '—'}</span></div>
          </div>
          <button type="submit" disabled={placing || !selectedProduct}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-900 font-black py-3 rounded-full transition-colors flex items-center justify-center gap-2">
            <FiZap /> {placing ? 'Launching…' : `Launch Campaign — Rs.${budget.toLocaleString()}`}
          </button>
          <p className="text-center text-white/60 text-xs mt-2">You will be charged only when someone clicks your ad</p>
        </div>
      </form>
    </div>
  )
}
