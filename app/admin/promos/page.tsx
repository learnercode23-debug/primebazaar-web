'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCalendar, FiPlus, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

const PROMOS = [
  { id: 1, name: 'Dashain Mega Sale', type: 'Sitewide', discount: '30%', start: 'Oct 2', end: 'Oct 15', status: 'upcoming', budget: 50000, overlap: false },
  { id: 2, name: 'Flash Friday',      type: 'Electronics', discount: '20%', start: 'Sep 27', end: 'Sep 27', status: 'ended',    budget: 15000, overlap: false },
  { id: 3, name: 'Back to School',    type: 'Books & Stationery', discount: '15%', start: 'Sep 1', end: 'Sep 10', status: 'ended', budget: 12000, overlap: false },
  { id: 4, name: 'Teej Special',      type: 'Fashion', discount: '25%', start: 'Sep 5', end: 'Sep 12', status: 'ended', budget: 20000, overlap: true },
  { id: 5, name: 'New User Welcome',  type: 'First-time buyers', discount: '15%', start: 'Always', end: 'Always', status: 'active', budget: 0, overlap: false },
  { id: 6, name: 'Tihar Bonanza',     type: 'Sitewide', discount: '35%', start: 'Nov 1', end: 'Nov 8', status: 'upcoming', budget: 80000, overlap: false },
]

const CALENDAR_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const PROMO_EVENTS = [
  { day: 1,  len: 8, name: 'Tihar Bonanza', color: 'bg-violet-500' },
  { day: 27, len: 1, name: 'Flash Friday',  color: 'bg-amber-500' },
]

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100 text-blue-700',
  ended:    'bg-gray-100 text-gray-600',
}

export default function PromoCalendarPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Sitewide', discount: '', start: '', end: '' })

  const shown = PROMOS.filter(p => filter === 'all' || p.status === filter)

  function create(e: React.FormEvent) {
    e.preventDefault()
    toast.success(`Promo "${form.name}" scheduled!`)
    setShowNew(false)
    setForm({ name: '', type: 'Sitewide', discount: '', start: '', end: '' })
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
            <p className="text-sm text-gray-500">Schedule and manage promotional campaigns</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
          <FiPlus /> New Promo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',   value: PROMOS.filter(p=>p.status==='active').length,   color: 'text-green-600' },
          { label: 'Upcoming', value: PROMOS.filter(p=>p.status==='upcoming').length, color: 'text-blue-600' },
          { label: 'Overlap Warnings', value: PROMOS.filter(p=>p.overlap).length,    color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        {(['list','calendar'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${tab === t ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'}`}>
            {t}
          </button>
        ))}
        {tab === 'list' && (
          <div className="ml-auto flex gap-2">
            {(['all','active','upcoming','ended'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar view */}
      {tab === 'calendar' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="font-black text-gray-900 mb-4">November 2026</p>
          <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="font-bold text-gray-500 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Nov starts on Sunday */}
            {CALENDAR_DAYS.map(day => {
              const event = PROMO_EVENTS.find(e => day >= e.day && day < e.day + e.len)
              return (
                <div key={day} className={`relative min-h-[52px] rounded-xl border text-xs p-1.5 ${event ? 'border-violet-200 bg-violet-50' : 'border-gray-100'}`}>
                  <span className={`font-bold ${event ? 'text-violet-700' : 'text-gray-700'}`}>{day}</span>
                  {event && day === event.day && (
                    <div className={`mt-0.5 ${event.color} text-white text-[9px] font-bold px-1 py-0.5 rounded leading-tight`}>
                      {event.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {tab === 'list' && (
        <div className="space-y-3">
          {shown.map(promo => (
            <div key={promo.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${promo.overlap ? 'border-amber-300' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-gray-900">{promo.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[promo.status]}`}>{promo.status}</span>
                    {promo.overlap && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                        <FiAlertCircle className="text-[10px]" /> Overlap warning
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                    <span>📋 {promo.type}</span>
                    <span>🏷️ {promo.discount} off</span>
                    <span>📅 {promo.start} → {promo.end}</span>
                    {promo.budget > 0 && <span>💰 Budget: Rs.{promo.budget.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-violet-600 border border-violet-200 hover:bg-violet-50 px-3 py-1.5 rounded-xl font-bold transition-colors">Edit</button>
                  {promo.status !== 'ended' && (
                    <button onClick={() => toast.success(`${promo.name} paused`)} className="text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl font-bold transition-colors">Pause</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New promo modal */}
      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNew(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="font-black text-gray-900 text-lg mb-4">Schedule New Promo</h2>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Promo Name</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                    placeholder="e.g. Dashain Mega Sale" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Discount</label>
                    <input required value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400"
                      placeholder="e.g. 20%" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400">
                      <option>Sitewide</option><option>Electronics</option><option>Fashion</option><option>Books</option><option>Groceries</option>
                    </select>
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
                  <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors">Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
