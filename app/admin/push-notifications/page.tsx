'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiBell, FiSend, FiUsers, FiClock, FiEye } from 'react-icons/fi'

interface BroadcastRecord {
  title: string
  message: string
  link?: string
  sentAt: string
  recipients: number
  read: number
}

export default function PushNotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ title: '', message: '', link: '', targetRole: 'all' })
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<BroadcastRecord[]>([])
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/admin/push-notifications').then(r => setHistory(r.data.data || [])).catch(() => {})
  }, [user, router])

  async function send() {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message required'); return }
    setSending(true)
    try {
      const r = await axios.post('/api/admin/push-notifications', form)
      toast.success(`Sent to ${r.data.data.sent} users!`)
      setForm({ title: '', message: '', link: '', targetRole: 'all' })
      setPreview(false)
      const h = await axios.get('/api/admin/push-notifications')
      setHistory(h.data.data || [])
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  if (!user) return <LoadingSpinner fullPage />

  const TARGET_OPTIONS = [
    { value: 'all', label: 'All Users', icon: '👥' },
    { value: 'customer', label: 'Customers Only', icon: '🛒' },
    { value: 'seller', label: 'Sellers Only', icon: '🏪' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiBell className="text-violet-500 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
          <p className="text-sm text-gray-500">Broadcast messages to users in real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FiSend /> Compose Broadcast</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Audience</label>
              <div className="flex gap-2">
                {TARGET_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, targetRole: o.value }))}
                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${form.targetRole === o.value ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-violet-200'}`}>
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={80}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g. Flash Sale — 50% Off Today Only!" />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/80</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} maxLength={200}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Write a compelling message…" />
              <p className="text-xs text-gray-400 mt-1">{form.message.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deep Link (optional)</label>
              <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="/deals or /products?sort=discountPercent" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPreview(true)} disabled={!form.title || !form.message}
                className="flex-1 border border-violet-600 text-violet-600 hover:bg-violet-50 font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <FiEye /> Preview
              </button>
              <button onClick={send} disabled={sending || !form.title || !form.message}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {sending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : <><FiSend /> Send Now</>}
              </button>
            </div>
          </div>
        </div>

        {/* Phone preview */}
        <div className="flex flex-col gap-4">
          {preview && form.title && (
            <div className="bg-gray-900 rounded-3xl p-4 border-4 border-gray-700 mx-auto w-72">
              <div className="bg-white rounded-2xl p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                    <FiBell className="text-white text-xs" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">PrimePasal</span>
                  <span className="text-xs text-gray-400 ml-auto">now</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{form.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{form.message}</p>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Preview — not sent yet</p>
            </div>
          )}

          {/* Recent broadcasts */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <FiClock className="text-gray-400" />
              <h3 className="font-bold text-gray-900 text-sm">Recent Broadcasts</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No broadcasts yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((b, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{b.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{b.message}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-violet-600 flex items-center gap-1"><FiUsers className="text-[10px]" /> {b.recipients}</p>
                        <p className="text-[10px] text-gray-400">{Math.round((b.read / b.recipients) * 100) || 0}% read</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(b.sentAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
