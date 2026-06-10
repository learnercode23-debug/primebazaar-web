'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiZap, FiPlus, FiTrendingUp, FiCheckCircle, FiClock, FiX } from 'react-icons/fi'

interface Variant { name: string; visitors: number; conversions: number }
interface ABTest {
  _id: string
  name: string
  metric: string
  status: 'running' | 'paused' | 'completed'
  startDate: string
  createdAt: string
  variantA: Variant
  variantB: Variant
  winner?: 'A' | 'B' | null
}

function cvr(visitors: number, conversions: number) {
  return visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00'
}

function uplift(a: number, b: number) {
  return a > 0 ? (((b - a) / a) * 100).toFixed(1) : '0.0'
}

// Standard error normal CDF — two-proportion z-test → confidence %.
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}
function confidence(a: Variant, b: Variant): number {
  if (a.visitors < 30 || b.visitors < 30) return 0
  const p1 = a.conversions / a.visitors
  const p2 = b.conversions / b.visitors
  const p = (a.conversions + b.conversions) / (a.visitors + b.visitors)
  const se = Math.sqrt(p * (1 - p) * (1 / a.visitors + 1 / b.visitors))
  if (se === 0) return 0
  const z = Math.abs(p2 - p1) / se
  const conf = (erf(z / Math.SQRT2)) * 100 // two-tailed → 1 - 2*(1-Φ(z)) = erf(z/√2)
  return Math.max(0, Math.min(99, Math.round(conf)))
}

// Log observed traffic for a variant (e.g. from Google Analytics) — adds to running totals
function RecordForm({ testId, onSaved }: { testId: string; onSaved: (t: ABTest) => void }) {
  const [variant, setVariant] = useState<'A' | 'B'>('A')
  const [visitors, setVisitors] = useState('')
  const [conversions, setConversions] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!Number(visitors) && !Number(conversions)) { toast.error('Enter visitors and/or conversions'); return }
    setBusy(true)
    try {
      const r = await axios.patch('/api/admin/ab-testing', {
        id: testId,
        record: { variant, visitors: Number(visitors) || 0, conversions: Number(conversions) || 0 },
      })
      onSaved(r.data.data)
      setVisitors(''); setConversions('')
      toast.success(`Data recorded for Variant ${variant}`)
    } catch { toast.error('Failed to record data') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 justify-center bg-gray-50 border border-gray-100 rounded-xl p-3">
      <span className="text-xs font-bold text-gray-500">Record data:</span>
      <select value={variant} onChange={e => setVariant(e.target.value as 'A' | 'B')}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
        <option value="A">Variant A</option>
        <option value="B">Variant B</option>
      </select>
      <input type="number" min="0" value={visitors} onChange={e => setVisitors(e.target.value)} placeholder="+ visitors"
        className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
      <input type="number" min="0" value={conversions} onChange={e => setConversions(e.target.value)} placeholder="+ conversions"
        className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
      <button onClick={save} disabled={busy}
        className="text-xs bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
        {busy ? 'Saving…' : 'Add'}
      </button>
    </div>
  )
}

export default function ABTestingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', metric: '', variantA: '', variantB: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, router])

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/admin/ab-testing')
      setTests(r.data.data || [])
    } catch { toast.error('Failed to load tests') }
    finally { setLoading(false) }
  }

  async function createTest() {
    if (!form.name || !form.metric || !form.variantA || !form.variantB) { toast.error('Fill all fields'); return }
    setBusy(true)
    try {
      const r = await axios.post('/api/admin/ab-testing', form)
      setTests(t => [r.data.data, ...t])
      setForm({ name: '', metric: '', variantA: '', variantB: '' })
      setShowCreate(false)
      toast.success('A/B test created!')
    } catch { toast.error('Failed to create test') }
    finally { setBusy(false) }
  }

  async function declareWinner(id: string, winner: 'A' | 'B') {
    try {
      await axios.patch('/api/admin/ab-testing', { id, winner })
      setTests(t => t.map(test => test._id === id ? { ...test, status: 'completed', winner } : test))
      toast.success(`Variant ${winner} declared winner!`)
    } catch { toast.error('Action failed') }
  }

  const statusBadge = (s: string) =>
    s === 'running' ? 'bg-green-100 text-green-700' :
    s === 'paused' ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-600'

  if (!user || loading) return <LoadingSpinner fullPage />

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

      {tests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
          <FiZap className="text-5xl mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No experiments yet</p>
          <p className="text-sm mt-1">Click &quot;New Test&quot; to create your first A/B experiment.</p>
        </div>
      ) : (
        /* Tests list */
        <div className="space-y-4">
          {tests.map(test => {
            const cvrA = parseFloat(cvr(test.variantA.visitors, test.variantA.conversions))
            const cvrB = parseFloat(cvr(test.variantB.visitors, test.variantB.conversions))
            const lift = parseFloat(uplift(cvrA, cvrB))
            const conf = confidence(test.variantA, test.variantB)
            const leading = cvrB > cvrA ? 'B' : cvrA > cvrB ? 'A' : null
            return (
              <div key={test._id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{test.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(test.status)}`}>{test.status}</span>
                      {test.winner && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">Winner: {test.winner}</span>}
                    </div>
                    <p className="text-sm text-gray-500">Metric: <span className="font-medium text-gray-700">{test.metric}</span> · Started {new Date(test.startDate || test.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">Confidence</p>
                    <p className={`text-2xl font-black ${conf >= 95 ? 'text-green-600' : conf >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>{conf}%</p>
                    <p className="text-xs text-gray-400">{conf >= 95 ? '✓ Statistically significant' : 'Needs more data'}</p>
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

                {test.status === 'running' && (
                  <RecordForm testId={test._id} onSaved={updated => setTests(t => t.map(x => x._id === updated._id ? updated : x))} />
                )}

                {lift !== 0 && (
                  <p className="mt-3 text-sm text-center">
                    {lift > 0 ? (
                      <span className="text-green-600 font-semibold">▲ Variant B is {Math.abs(lift)}% better than A on {test.metric}</span>
                    ) : (
                      <span className="text-red-500 font-semibold">▼ Variant A is {Math.abs(lift)}% better than B on {test.metric}</span>
                    )}
                  </p>
                )}

                {test.status === 'running' && conf >= 95 && !test.winner && (
                  <div className="mt-4 flex gap-3 justify-center">
                    <p className="text-sm text-gray-600 self-center">Declare winner:</p>
                    <button onClick={() => declareWinner(test._id, 'A')} className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700">Variant A</button>
                    <button onClick={() => declareWinner(test._id, 'B')} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700">Variant B</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
                <button onClick={() => setShowCreate(false)} disabled={busy} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">Cancel</button>
                <button onClick={createTest} disabled={busy} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">{busy ? 'Creating…' : 'Create Test'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
