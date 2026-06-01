'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi'

interface BankAccount {
  _id: string
  seller: { name: string; email: string; phone?: string }
  accountHolderName: string
  bankName: string
  accountLast4: string
  walletType: string
  kycStatus: string
  isVerified: boolean
  kycNote?: string
  createdAt: string
}

const KYC_COLOR: Record<string, string> = {
  verified:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  submitted: 'bg-amber-100 text-amber-700',
  pending:   'bg-gray-100 text-gray-600',
}

export default function AdminSellerBanksPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') { router.push('/'); return }
    fetchAccounts()
  }, [user, authLoading])

  async function fetchAccounts() {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/seller-banks')
      setAccounts(res.data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  async function handleKYC(accountId: string, action: 'approve' | 'reject') {
    setActing(accountId)
    try {
      await axios.put('/api/admin/seller-banks', { accountId, action, note })
      toast.success(`Bank account ${action === 'approve' ? 'verified' : 'rejected'}`)
      setNote('')
      fetchAccounts()
    } catch { toast.error('Failed to update') }
    finally { setActing(null) }
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />

  const pending = accounts.filter((a) => a.kycStatus !== 'verified' && a.kycStatus !== 'rejected')
  const verified = accounts.filter((a) => a.kycStatus === 'verified')

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Bank Accounts</h1>
      <p className="text-sm text-gray-500 mb-6">Verify seller bank details before enabling payouts</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Pending KYC', value: pending.length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Verified', value: verified.length, color: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Total', value: accounts.length, color: 'text-violet-600 bg-violet-50 border-violet-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`border rounded-xl p-4 bg-white ${color.split(' ')[2]}`}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pending KYC — needs action */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
            <h2 className="font-bold text-amber-800 flex items-center gap-2">
              <FiCreditCard /> Pending KYC Verification ({pending.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map((acct) => (
              <div key={acct._id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-900">{acct.seller?.name}</p>
                    <p className="text-xs text-gray-500">{acct.seller?.email}</p>
                    {acct.seller?.phone && <p className="text-xs text-gray-500">{acct.seller.phone}</p>}
                    <div className="mt-2 bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                      <p><span className="text-gray-500 text-xs">Bank / Wallet:</span> <span className="font-semibold">{acct.bankName}</span></p>
                      <p><span className="text-gray-500 text-xs">Account holder:</span> <span className="font-semibold">{acct.accountHolderName}</span></p>
                      <p><span className="text-gray-500 text-xs">Account no:</span> <span className="font-mono font-semibold">••••{acct.accountLast4}</span></p>
                      <p><span className="text-gray-500 text-xs">Type:</span> <span className="capitalize font-semibold">{acct.walletType}</span></p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${KYC_COLOR[acct.kycStatus] || KYC_COLOR.pending}`}>
                      KYC {acct.kycStatus}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      placeholder="Note (optional)"
                      className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      onFocus={() => {}}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleKYC(acct._id, 'approve')}
                        disabled={acting === acct._id}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm transition-all"
                      >
                        <FiCheck /> Verify
                      </button>
                      <button
                        onClick={() => handleKYC(acct._id, 'reject')}
                        disabled={acting === acct._id}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm transition-all"
                      >
                        <FiX /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">All Bank Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Seller', 'Bank', 'Account', 'Type', 'KYC Status', 'Note'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map((acct) => (
                <tr key={acct._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{acct.seller?.name}</p>
                    <p className="text-xs text-gray-400">{acct.seller?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{acct.bankName}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {acct.accountHolderName}<br />••••{acct.accountLast4}
                  </td>
                  <td className="px-4 py-3 capitalize text-xs">{acct.walletType}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${KYC_COLOR[acct.kycStatus] || KYC_COLOR.pending}`}>
                      {acct.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{acct.kycNote || '—'}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No bank accounts added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
