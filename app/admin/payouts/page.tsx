'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiDollarSign, FiPlay, FiCheckCircle, FiAlertCircle, FiClock, FiUsers } from 'react-icons/fi'

interface Wallet {
  seller: { name: string; email: string }
  totalEarned: number
  pendingBalance: number
  availableBalance: number
  paidOutBalance: number
  bank?: { bankName: string; accountLast4: string; kycStatus: string; isVerified: boolean }
}

interface Payout {
  _id: string
  seller: { name: string; email: string }
  amount: number
  bankName: string
  accountLast4: string
  status: string
  referenceId?: string
  initiatedAt: string
  completedAt?: string
  notes?: string
}

interface PlatformStats {
  totalPaidOut: number
  totalPending: number
  totalAvailable: number
  sellersEligible: number
}

const PAYOUT_COLORS: Record<string, string> = {
  initiated:  'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  success:    'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
}

export default function AdminPayoutsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') { router.push('/'); return }
    fetchData()
  }, [user, authLoading])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/payouts')
      setWallets(res.data.data.wallets || [])
      setPayouts(res.data.data.payouts || [])
      setStats(res.data.data.platformStats)
    } catch {
      toast.error('Failed to load payout data')
    } finally {
      setLoading(false)
    }
  }

  async function runSettlement() {
    if (!confirm('Run settlement now? This will create payouts for all eligible sellers.')) return
    setRunning(true)
    try {
      const res = await axios.post('/api/admin/payouts/run')
      toast.success(res.data.message)
      fetchData()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Settlement failed')
    } finally {
      setRunning(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Payouts</h1>
          <p className="text-sm text-gray-500">Settlement management & payout history</p>
        </div>
        <button
          onClick={runSettlement}
          disabled={running}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
        >
          {running ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</> : <><FiPlay /> Run Settlement</>}
        </button>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Paid Out', value: formatPrice(stats.totalPaidOut), icon: FiCheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Available Now', value: formatPrice(stats.totalAvailable), icon: FiDollarSign, color: 'text-violet-600 bg-violet-50' },
            { label: 'Pending (return window)', value: formatPrice(stats.totalPending), icon: FiClock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Eligible Sellers', value: stats.sellersEligible, icon: FiUsers, color: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}><Icon /></div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller Wallets */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Seller Balances</h2>
            <p className="text-xs text-gray-500">Sellers with ≥ Rs.100 available are eligible for payout</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {wallets.map((w, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{w.seller.name}</p>
                    <p className="text-xs text-gray-400">{w.seller.email}</p>
                    {w.bank && (
                      <p className="text-xs mt-1 flex items-center gap-1">
                        {w.bank.kycStatus === 'verified'
                          ? <span className="text-green-600">✓ KYC OK — {w.bank.bankName} ••••{w.bank.accountLast4}</span>
                          : <span className="text-amber-600 flex items-center gap-0.5"><FiAlertCircle className="text-xs" /> KYC {w.bank.kycStatus}</span>
                        }
                      </p>
                    )}
                    {!w.bank && <p className="text-xs text-red-500 mt-1">No bank account added</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">{formatPrice(w.availableBalance)}</p>
                    <p className="text-xs text-gray-400">available</p>
                    <p className="text-xs text-amber-600">{formatPrice(w.pendingBalance)} pending</p>
                  </div>
                </div>
              </div>
            ))}
            {wallets.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">No seller wallets yet</div>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Payout History</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {payouts.map((payout) => (
              <div key={payout._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{payout.seller.name}</p>
                    <p className="text-xs text-gray-400">{payout.bankName} ••••{payout.accountLast4}</p>
                    <p className="text-xs text-gray-400">{formatDate(payout.initiatedAt)}</p>
                    {payout.referenceId && <p className="text-xs text-gray-400 font-mono">Ref: {payout.referenceId}</p>}
                    {payout.notes && <p className="text-xs text-amber-600 mt-0.5">{payout.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatPrice(payout.amount)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYOUT_COLORS[payout.status] || 'bg-gray-100 text-gray-600'}`}>
                      {payout.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {payouts.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">No payouts yet. Run a settlement to create payouts.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
