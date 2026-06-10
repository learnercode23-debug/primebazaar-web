'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiAward, FiArrowLeft, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi'

interface Application {
  _id: string
  brandName: string
  website?: string
  category: string
  tradeMark: boolean
  trademarkNumber?: string
  status: 'pending' | 'approved' | 'rejected'
  note?: string
  createdAt: string
}

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Garden', 'Books', 'Sports & Outdoors', 'Beauty & Health', 'Toys & Games', 'Automotive', 'Other']

export default function SellerBrandRegistryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ brandName: '', website: '', category: 'Electronics', tradeMark: false, trademarkNumber: '' })

  useEffect(() => {
    if (authLoading) return
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) { router.push('/'); return }
    load()
  }, [user, authLoading, router])

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/seller/brands')
      setApps(r.data.data || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brandName.trim()) { toast.error('Brand name is required'); return }
    setSubmitting(true)
    try {
      const r = await axios.post('/api/seller/brands', form)
      setApps(a => [r.data.data, ...a])
      setForm({ brandName: '', website: '', category: 'Electronics', tradeMark: false, trademarkNumber: '' })
      toast.success('Application submitted! An admin will review it.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit'
      toast.error(msg)
    } finally { setSubmitting(false) }
  }

  if (authLoading || !user) return <LoadingSpinner fullPage />

  const statusMeta = {
    pending: { icon: FiClock, cls: 'bg-amber-100 text-amber-700', label: 'Pending review' },
    approved: { icon: FiCheckCircle, cls: 'bg-green-100 text-green-700', label: 'Approved' },
    rejected: { icon: FiXCircle, cls: 'bg-red-100 text-red-700', label: 'Rejected' },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/seller" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiAward className="text-amber-500 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Registry</h1>
          <p className="text-sm text-gray-500">Register your brand for IP protection and a verified badge</p>
        </div>
      </div>

      {/* Application form */}
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 mb-8">
        <h2 className="font-bold text-gray-900">Apply for Brand Registry</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Brand name *</label>
            <input required value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
              placeholder="e.g. TechNova" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Website (optional)</label>
            <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="yourbrand.com" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Trademark number (optional)</label>
            <input value={form.trademarkNumber} onChange={e => setForm(f => ({ ...f, trademarkNumber: e.target.value, tradeMark: e.target.value.trim() !== '' }))}
              placeholder="e.g. TM-2026-00123" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.tradeMark} onChange={e => setForm(f => ({ ...f, tradeMark: e.target.checked }))} className="accent-violet-600" />
          I hold a registered trademark for this brand
        </label>
        <button type="submit" disabled={submitting}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>

      {/* My applications */}
      <h2 className="font-bold text-gray-900 mb-3">My Applications</h2>
      {loading ? (
        <LoadingSpinner />
      ) : apps.length === 0 ? (
        <p className="text-center py-10 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">No applications yet</p>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const meta = statusMeta[app.status]
            const Icon = meta.icon
            return (
              <div key={app._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{app.brandName}</h3>
                    {app.tradeMark && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">™</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{app.category}{app.website ? ` · ${app.website}` : ''} · {new Date(app.createdAt).toLocaleDateString()}</p>
                  {app.note && app.status === 'rejected' && <p className="text-xs text-red-500 mt-1 italic">{app.note}</p>}
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${meta.cls}`}>
                  <Icon className="text-xs" /> {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
