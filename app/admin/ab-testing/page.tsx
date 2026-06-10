'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiZap, FiPlus, FiTrendingUp, FiUsers, FiCheckCircle, FiClock, FiX } from 'react-icons/fi'

interface ABTest {
  id: string
  name: string
  metric: string
  status: 'running' | 'paused' | 'completed'
  startDate: string
  variantA: { name: string; visitors: number; conversions: number }
  variantB: { name: string; visitors: number; conversions: number }
  winner?: 'A' | 'B' | null
  confidence: number
}

const SAMPLE_TESTS: ABTest[] = [
  {
    id: '1', name: 'CTA Button Color — Orange vs Purple', metric: 'Add to Cart clicks', status: 'running', startDate: '2026-06-01',
    variantA: { name: 'Orange (control)', visitors: 4820, conversions: 1248 },
    variantB: { name: 'Purple (variant)', visitors: 4765, conversions: 1381 },
    confidence: 94,
  },
  {
    id: '2', name: 'Product Page — Single image vs Gallery', metric: 'Purchase rate', status: 'completed', startDate: '2026-05-10',
    variantA: { name: 'Single image', visitors: 8200, conversions: 574 },
    variantB: { name: 'Gallery (3 images)', visitors: 8150, conversions: 718 },
    winner: 'B', confidence: 99,
  },
  {
    id: '3', name: 'Homepage Hero — Deals vs New Arrivals', metric: 'Click-through rate', status: 'paused', startDate: '2026-06-05',
    variantA: { name: 'Deals banner', visitors: 1200, conversions: 312 },
    variantB: { name: 'New Arrivals banner', visitors: 1185, conversions: 290 },
    confidence: 61,
  },
]

function cvr(visitors: number, conversions: number) {
  return visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00'
}

function uplift(a: number, b: number) {
  return a > 0 ? (((b - a) / a) * 100).toFixed(1) : '0.0'
}

export default function ABTestingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tests, setTests] = useState<ABTest[]>(SAMPLE_TESTS)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', metric: '', variantA: '', variantB: '' })

  if (user && user.role !== 'admin') { router.push('/'); return null }

  function createTest() {
    if (!form.name || !form.metric || !form.variantA || !form.variantB) { toast.error('Fill all fields'); return }
    const newTest: ABTest = {
      id: Date.now().toString(), name: form.name, metric: form.metric, status: 'running',
      startDate: new Date().toISOString().split('T')[0],
      variantA: { name: form.variantA, visitors: 0, conversions: 0 },
      variantB: { name: form.variantB, visitors: 0, conversions: 0 },
      confidence: 0,
    }
    setTests(t => [newTest, ...t])
    setForm({ name: '', metric: '', variantA: '', variantB: '' })
    setShowCreate(false)
    toast.success('A/B test created!')
  }

  function declareWinner(id: string, winner: 'A' | 'B') {
    setTests(t => t.map(test => test.id === id ? { ...test, status: 'completed', winner } : test))
    toast.success(`Variant ${winner} declared winner!`)
  }

  const statusBadge = (s: string) =>
    s === 'running' ? 'bg-green-100 text-green-700' :
    s === 'paused' ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-600'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
          <FiZap className="text-amber-500 text-2xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">A/B Testing</h1>
            <p className="text-sm text-gray-500">Optimize listings and UI with controlled experiments</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
          <FiPlus /> New Test
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Running', value: tests.filter(t => t.status === 'running').length, color: 'text-green-600 bg-green-50', icon: FiTrendingUp },
          { label: 'Completed', value: tests.filter(t => t.status === 'completed').length, color: 'text-gray-600 bg-gray-50', icon: FiCheckCircle },
          { label: 'Paused', value: tests.filter(t => t.status === 'paused').length, color: 'text-yellow-600 bg-yellow-50', icon: FiClock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${color} bg-opacity-20`}>
            <Icon className={`text-2xl ${color.split(' ')[0]}`} />
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tests list */}
      <div className="space-y-4">
        {tests.map(test => {
          const cvrA = parseFloat(cvr(test.variantA.visitors, test.variantA.conversions))
          const cvrB = parseFloat(cvr(test.variantB.visitors, test.variantB.conversions))
          const lift = parseFloat(uplift(cvrA, cvrB))
          const leading = cvrB > cvrA ? 'B' : cvrA > cvrB ? 'A' : null
          return (
            <div key={test.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{test.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(test.status)}`}>{test.status}</span>
                    {test.winner && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">Winner: {test.winner}</span>}
                  </div>
                  <p className="text-sm text-gray-500">Metric: <span className="font-medium text-gray-700">{test.metric}</span> · Started {test.startDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">Confidence</p>
                  <p className={`text-2xl font-black ${test.confidence >= 95 ? 'text-green-600' : test.confidence >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>{test.confidence}%</p>
                  <p className="text-xs text-gray-400">{test.confidence >= 95 ? '✓ Statistically significant' : 'Needs more data'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(['A', 'B'] as const).map(v => {
                  const variant = v === 'A' ? test.variantA : test.variantB
                  const cvrVal = cvr(variant.visitors, variant.conversions)
                  const isLeading = leading === v
                  const isWinner = test.winner === v
                  return (
                    <div key={v} className={`rounded-xl p-4 border ${isWinner ? 'border-green-400 bg-green-50' : isLeading ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isWinner ? 'bg-green-200 text-green-800' : isLeading ? 'bg-violet-200 text-violet-800' : 'bg-gray-200 text-gray-600'}`}>Variant {v}</span>
                        {isWinner && <FiCheckCircle className="text-green-600" />}
                        {isLeading && !isWinner && <FiTrendingUp className="text-violet-600" />}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm mb-3">{variant.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-lg font-black text-gray-900">{cvrVal}%</p><p className="text-[10px] text-gray-500">CVR</p></div>
                        <div><p className="text-lg font-black text-gray-900">{variant.visitors.toLocaleString()}</p><p className="text-[10px] text-gray-500">Visitors</p></div>
                        <div><p className="text-lg font-black text-gray-900">{variant.conversions.toLocaleString()}</p><p className="text-[10px] text-gray-500">Converts</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {lift !== 0 && (
                <p className="mt-3 text-sm text-center">
                  {lift > 0 ? (
                    <span className="text-green-600 font-semibold">▲ Variant B is {Math.abs(lift)}% better than A on {test.metric}</span>
                  ) : (
                    <span className="text-red-500 font-semibold">▼ Variant A is {Math.abs(lift)}% better than B on {test.metric}</span>
                  )}
                </p>
              )}

              {test.status === 'running' && test.confidence >= 95 && !test.winner && (
                <div className="mt-4 flex gap-3 justify-center">
                  <p className="text-sm text-gray-600 self-center">Declare winner:</p>
                  <button onClick={() => declareWinner(test.id, 'A')} className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700">Variant A</button>
                  <button onClick={() => declareWinner(test.id, 'B')} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700">Variant B</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Create A/B Test</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700"><FiX /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'name', label: 'Test name', placeholder: 'e.g. CTA Button Color Test' },
                { key: 'metric', label: 'Metric to optimize', placeholder: 'e.g. Add to Cart clicks' },
                { key: 'variantA', label: 'Variant A (control)', placeholder: 'e.g. Orange button' },
                { key: 'variantB', label: 'Variant B (experiment)', placeholder: 'e.g. Purple button' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={createTest} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm">Create Test</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
