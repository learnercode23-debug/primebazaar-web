'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiTag } from 'react-icons/fi'

interface Coupon {
  _id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxDiscount?: number
  validFrom: string
  validTo: string
  usageLimit: number
  usedCount: number
  isActive: boolean
}

const EMPTY_FORM = {
  code: '', discountType: 'percentage', discountValue: '15',
  minPurchase: '0', maxDiscount: '', validFrom: '', validTo: '', usageLimit: '100',
}

export default function AdminCouponsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    load()
  }, [user, router])

  async function load() {
    try {
      const res = await axios.get('/api/admin/coupons')
      setCoupons(res.data.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post('/api/admin/coupons', {
        ...form,
        discountValue: parseFloat(form.discountValue),
        minPurchase: parseFloat(form.minPurchase) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
        usageLimit: parseInt(form.usageLimit) || 100,
      })
      toast.success('Coupon created!')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Coupon) {
    await axios.put(`/api/admin/coupons/${c._id}`, { isActive: !c.isActive })
    setCoupons(p => p.map(x => x._id === c._id ? { ...x, isActive: !c.isActive } : x))
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Delete this coupon?')) return
    await axios.delete(`/api/admin/coupons/${id}`)
    setCoupons(p => p.filter(x => x._id !== id))
    toast.success('Deleted')
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiTag className="text-amazon-orange text-2xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
            <p className="text-sm text-gray-500">Create and manage discount codes</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-1"
        >
          <FiPlus /> New Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Create Coupon</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required
                placeholder="SAVE20" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
              <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (Rs.)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value * {form.discountType === 'percentage' ? '(%)' : '(Rs.)'}
              </label>
              <input type="number" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} required min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (Rs.)</label>
              <input type="number" value={form.minPurchase} onChange={e => setForm(p => ({ ...p, minPurchase: e.target.value }))} min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            {form.discountType === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Cap (Rs.)</label>
                <input type="number" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))} min="0" placeholder="No cap"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
              <input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
              <input type="date" value={form.validFrom} min={today} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid To *</label>
              <input type="date" value={form.validTo} min={form.validFrom || today} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2 rounded-full text-sm">
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {coupons.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No coupons yet. Click "New Coupon" to create one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Code', 'Discount', 'Min Purchase', 'Valid Period', 'Usage', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map(c => {
                const expired = new Date(c.validTo) < new Date()
                const exhausted = c.usedCount >= c.usageLimit
                const statusColor = !c.isActive ? 'bg-gray-100 text-gray-500' : expired ? 'bg-red-100 text-red-600' : exhausted ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                const statusLabel = !c.isActive ? 'Inactive' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active'
                return (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `Rs. ${c.discountValue}`}
                      {c.maxDiscount ? <span className="text-xs text-gray-400 ml-1">(max Rs.{c.maxDiscount})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.minPurchase > 0 ? `Rs. ${c.minPurchase}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(c.validFrom).toLocaleDateString()} → {new Date(c.validTo).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.usedCount} / {c.usageLimit}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(c)} className={`text-xl ${c.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                          {c.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                        <button onClick={() => deleteCoupon(c._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
