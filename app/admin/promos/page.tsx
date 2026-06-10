'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { FiArrowLeft, FiCalendar, FiPlus, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'

interface Promo {
  _id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  validFrom: string
  validTo: string
  usageLimit: number
  usedCount: number
  isActive: boolean
}

type Status = 'active' | 'upcoming' | 'ended' | 'paused'

const STATUS_STYLES: Record<Status, string> = {
  active:   'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100 text-blue-700',
  ended:    'bg-gray-100 text-gray-600',
  paused:   'bg-amber-100 text-amber-700',
}

const PALETTE = ['bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-sky-500', 'bg-fuchsia-500']

function statusOf(p: Promo, now: Date): Status {
  if (!p.isActive) return 'paused'
  if (now < new Date(p.validFrom)) return 'upcoming'
  if (now > new Date(p.validTo)) return 'ended'
  return 'active'
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// True when two promos' date ranges overlap (both running at once)
function rangesOverlap(a: Promo, b: Promo) {
  return new Date(a.validFrom) <= new Date(b.validTo) && new Date(b.validFrom) <= new Date(a.validTo)
}

export default function PromoCalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: '', minPurchase: '', usageLimit: '100', start: '', end: '' })

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/')
  }, [user, authLoading, router])

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/admin/coupons')
      setPromos(r.data.data || [])
    } catch { toast.error('Failed to load promos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user?.role === 'admin') fetchPromos() }, [user, fetchPromos])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post('/api/admin/coupons', {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minPurchase: Number(form.minPurchase) || 0,
        usageLimit: Number(form.usageLimit) || 100,
        validFrom: form.start,
        validTo: form.end,
      })
      toast.success(`Promo "${form.code.toUpperCase()}" scheduled — customers can use it at checkout`)
      setShowNew(false)
      setForm({ code: '', discountType: 'percentage', discountValue: '', minPurchase: '', usageLimit: '100', start: '', end: '' })
      fetchPromos()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create promo')
    } finally { setSaving(false) }
  }

  async function togglePause(p: Promo) {
    try {
      await axios.put(`/api/admin/coupons/${p._id}`, { isActive: !p.isActive })
      toast.success(p.isActive ? `${p.code} paused` : `${p.code} resumed`)
      fetchPromos()
    } catch { toast.error('Failed to update promo') }
  }

  if (authLoading || !user) return null

  const now = new Date()
  // Real overlap detection: two promos active/upcoming with intersecting date ranges
  const live = promos.filter(p => p.isActive && statusOf(p, now) !== 'ended')
  const overlapIds = new Set<string>()
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      if (rangesOverlap(live[i], live[j])) { overlapIds.add(live[i]._id); overlapIds.add(live[j]._id) }
    }
  }

  const shown = promos.filter(p => filter === 'all' || statusOf(p, now) === filter)

  // Current month calendar
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  function promosOnDay(day: number) {
    const date = new Date(year, month, day)
    return promos.filter(p => date >= new Date(new Date(p.validFrom).toDateString()) && date <= new Date(p.validTo))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Admin Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <FiCalendar className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Promo Calendar</h1>
            <p className="text-sm text-gray-500">Schedule and manage coupon campaigns — live at checkout</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPromos} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" title="Refresh">
            <FiRefreshCw className="text-gray-500 text-sm" />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <FiPlus /> New Promo
          </button>
        </div>
      </div>

      {/* Stats — derived from real coupons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active',   value: promos.filter(p => statusOf(p, now) === 'active').length,   color: 'text-green-600' },
          { label: 'Upcoming', value: promos.filter(p => statusOf(p, now) === 'upcoming').length, color: 'text-blue-600' },
          { label: 'Total Redemptions', value: promos.reduce((s, p) => s + (p.usedCount || 0), 0), color: 'text-violet-600' },
          { label: 'Overlap Warnings', value: overlapIds.size, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['list','calendar'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${tab === t ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {t}
          </button>
        ))}
        {tab === 'list' && (
          <div className="ml-auto flex gap-2 flex-wrap">
            {(['all','active','upcoming','paused','ended'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Calendar view — current month with real promo spans */}
          {tab === 'calendar' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="font-black text-gray-900 mb-4">{monthName}</p>
              <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="font-bold text-gray-500 py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayPromos = promosOnDay(day)
                  const isToday = day === now.getDate()
                  return (
                    <div key={day} className={`relative min-h-[56px] rounded-xl border text-xs p-1.5 ${isToday ? 'border-violet-400 ring-1 ring-violet-300' : dayPromos.length ? 'border-violet-200 bg-violet-50' : 'border-gray-100'}`}>
                      <span className={`font-bold ${dayPromos.length ? 'text-violet-700' : 'text-gray-700'}`}>{day}</span>
                      {dayPromos.slice(0, 2).map((p, i) => (
                        <div key={p._id} className={`mt-0.5 ${PALETTE[promos.indexOf(p) % PALETTE.length]} ${p.isActive ? '' : 'opacity-50'} text-white text-[9px] font-bold px-1 py-0.5 rounded leading-tight truncate`}>
                          {p.code}
                        </div>
                      ))}
                      {dayPromos.length > 2 && <p className="text-[9px] text-gray-400 mt-0.5">+{dayPromos.length - 2} more</p>}
                    </div>
                  )
                })}
              </div>
              {promos.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No promos scheduled — create one to see it on the calendar</p>}
            </div>
          )}

          {/* List view */}
          {tab === 'list' && (
            <div className="space-y-3">
              {shown.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400">
                  <FiCalendar className="text-4xl mx-auto mb-2" />
                  <p className="text-sm">No promos {filter !== 'all' ? `with status "${filter}"` : 'yet'}. Click New Promo to schedule a coupon campaign.</p>
                </div>
              ) : shown.map(promo => {
                const st = statusOf(promo, now)
                const hasOverlap = overlapIds.has(promo._id)
                return (
                  <div key={promo._id} className={`bg-white border rounded-2xl p-5 shadow-sm ${hasOverlap ? 'border-amber-300' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-black text-gray-900 font-mono">{promo.code}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[st]}`}>{st}</span>
                          {hasOverlap && (
                            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                              <FiAlertCircle className="text-[10px]" /> Overlaps another promo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                          <span>🏷️ {promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `Rs.${promo.discountValue.toLocaleString()} off`}</span>
                          <span>📅 {fmt(promo.validFrom)} → {fmt(promo.validTo)}</span>
                          <span>🎟️ {promo.usedCount}/{promo.usageLimit} used</span>
                          {promo.minPurchase > 0 && <span>🛒 Min Rs.{promo.minPurchase.toLocaleString()}</span>}
                        </div>
                      </div>
                      {st !== 'ended' && (
                        <button onClick={() => togglePause(promo)}
                          className="text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl font-bold transition-colors">
                          {promo.isActive ? 'Pause' : 'Resume'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* New promo modal — creates a real coupon usable at checkout */}
      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNew(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl pointer-events-auto">
              <h2 className="font-black text-gray-900 text-lg mb-1">Schedule New Promo</h2>
              <p className="text-xs text-gray-500 mb-4">Creates a coupon customers can apply at checkout during the dates below.</p>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Coupon Code</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-violet-400"
                    placeholder="e.g. DASHAIN30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Discount</label>
                    <input required type="number" min="1" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                      placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400">
                      <option value="percentage">% off</option>
                      <option value="fixed">Rs. fixed off</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min purchase (Rs.)</label>
                    <input type="number" min="0" value={form.minPurchase} onChange={e => setForm(f => ({ ...f, minPurchase: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Usage limit</label>
                    <input type="number" min="1" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                    <input type="date" required value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                    <input type="date" required value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNew(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm transition-colors">
                    {saving ? 'Scheduling…' : 'Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
