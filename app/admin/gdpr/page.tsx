'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiShield, FiSearch, FiTrash2, FiUser, FiAlertTriangle } from 'react-icons/fi'

interface UserResult {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
  isActive: boolean
}

export default function GDPRPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<UserResult | null>(null)
  const [reason, setReason] = useState('')

  if (user && user.role !== 'admin') { router.push('/'); return null }

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await axios.get(`/api/admin/gdpr?q=${encodeURIComponent(query)}`)
      setResults(r.data.data || [])
    } catch { toast.error('Search failed') }
    finally { setSearching(false) }
  }

  async function eraseUser() {
    if (!confirm) return
    setDeleting(confirm._id)
    try {
      await axios.delete('/api/admin/gdpr', { data: { userId: confirm._id, reason } })
      toast.success('User data anonymized (GDPR compliant)')
      setResults(r => r.filter(u => u._id !== confirm._id))
      setConfirm(null)
      setReason('')
    } catch { toast.error('Failed to erase user data') }
    finally { setDeleting(null) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600"><FiArrowLeft /></Link>
        <FiShield className="text-green-600 text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GDPR / Data Deletion</h1>
          <p className="text-sm text-gray-500">Anonymize user data in compliance with data protection laws</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <FiShield className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Right to Erasure (Article 17, GDPR)</p>
          <p>Erasure anonymizes the user&apos;s personal data (name, email, phone, addresses) and removes their notifications. Orders and financial records are retained for legal compliance. Reviews are de-linked from the user.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><FiSearch /> Find User</h2>
        <div className="flex gap-3">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by name or email…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={search} disabled={searching || !query.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">{results.length} result{results.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map(u => (
              <div key={u._id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <FiUser className="text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email} · {u.role} · joined {new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => setConfirm(u)}
                  className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-full transition-colors">
                  <FiTrash2 /> Erase Data
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="text-red-600 text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Confirm Data Erasure</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <p className="font-semibold text-gray-900">{confirm.name}</p>
              <p className="text-gray-500">{confirm.email}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for deletion</label>
              <input value={reason} onChange={e => setReason(e.target.value)}
                placeholder="e.g. User request via email on 10 Jun 2026"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <p className="text-xs text-gray-500 mb-5">This will anonymize the user&apos;s name, email, phone, and addresses. Financial records are retained.</p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirm(null); setReason('') }}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={eraseUser} disabled={!!deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {deleting ? 'Erasing…' : 'Erase Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
