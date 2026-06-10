'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiShield, FiCheck, FiX, FiSearch, FiAward, FiClock } from 'react-icons/fi'

interface BrandApplication {
  _id: string
  brandName: string
  seller?: { _id: string; name: string; email: string }
  website?: string
  category: string
  tradeMark: boolean
  trademarkNumber?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  note?: string
}

export default function BrandRegistryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [apps, setApps] = useState<BrandApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [noteModal, setNoteModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, router])

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/admin/brands')
      setApps(r.data.data || [])
    } catch { toast.error('Failed to load applications') }
    finally { setLoading(false) }
  }

  async function handle(id: string, action: 'approve' | 'reject') {
    setBusy(true)
    try {
      await axios.patch('/api/admin/brands', { id, action, note })
      setApps(a => a.map(app => app._id === id ? { ...app, status: action === 'approve' ? 'approved' : 'rejected', note } : app))
      toast.success(action === 'approve' ? 'Brand approved! Seller notified.' : 'Application rejected. Seller notified.')
      setNoteModal(null)
      setNote('')
    } catch { toast.error('Action failed') }
    finally { setBusy(false) }
  }

  const filtered = apps.filter(a =>
    a.status === tab &&
    (search === '' || a.brandName.toLowerCase().includes(search.toLowerCase()) || (a.seller?.name || '').toLowerCase().includes(search.toLowerCase()))
  )

  const tabCounts = {
    pending: apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiAward className="text-amber-500 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Registry</h1>
          <p className="text-sm text-gray-500">Verify and protect seller brands from IP abuse</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {(['pending', 'approved', 'rejected'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all capitalize border-b-2 -mb-px ${tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${t === 'pending' ? 'bg-amber-100 text-amber-700' : t === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {tabCounts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brand or seller…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiShield className="text-5xl mx-auto mb-3 opacity-40" />
          <p>No {tab} applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app._id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                    {app.brandName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900">{app.brandName}</h3>
                      {app.tradeMark && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">™ Trademarked{app.trademarkNumber ? ` · ${app.trademarkNumber}` : ''}</span>}
                    </div>
                    <p className="text-sm text-gray-600">{app.seller?.name || 'Unknown'}{app.seller?.email ? ` · ${app.seller.email}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Category: {app.category}{app.website ? ` · ${app.website}` : ''}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><FiClock className="text-[10px]" /> Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                    {app.note && <p className="text-xs text-gray-500 mt-1 italic">Note: {app.note}</p>}
                  </div>
                </div>
                {tab === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setNoteModal({ id: app._id, action: 'approve' }); setNote('Trademark verified') }}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl">
                      <FiCheck /> Approve
                    </button>
                    <button onClick={() => { setNoteModal({ id: app._id, action: 'reject' }); setNote('') }}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold px-3 py-2 rounded-xl">
                      <FiX /> Reject
                    </button>
                  </div>
                )}
                {tab !== 'pending' && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {tab === 'approved' ? '✓ Approved' : '✗ Rejected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {noteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-3">{noteModal.action === 'approve' ? 'Approve' : 'Reject'} Brand</h3>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Internal note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason or note…"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setNoteModal(null); setNote('') }} disabled={busy} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">Cancel</button>
              <button onClick={() => handle(noteModal.id, noteModal.action)} disabled={busy}
                className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 ${noteModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
