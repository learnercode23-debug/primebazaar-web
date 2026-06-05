'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiDollarSign, FiPlay, FiCheckCircle, FiAlertCircle, FiClock, FiUsers, FiSend, FiX } from 'react-icons/fi'

interface Wallet {
  sellerId: string
  seller: { name: string; email: string }
  totalEarned: number
  pendingBalance: number
  availableBalance: number
  paidOutBalance: number
  bank?: { bankName: string; accountLast4: string; accountHolderName: string; mobileWallet?: string; walletType?: string; kycStatus: string; isVerified: boolean }
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
  const [wallets, setWallets]   = useState<Wallet[]>([])
  const [payouts, setPayouts]   = useState<Payout[]>([])
  const [stats, setStats]       = useState<PlatformStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [seeding, setSeeding]   = useState(false)

  // Manual payout modal state
  const [manualTarget, setManualTarget] = useState<Wallet | null>(null)
  const [manualRef,    setManualRef]    = useState('')
  const [manualMethod, setManualMethod] = useState('eSewa')
  const [manualNotes,  setManualNotes]  = useState('')
  const [paying,       setPaying]       = useState(false)

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

  async function seedWallets() {
    setSeeding(true)
    try {
      const res = await axios.post('/api/admin/seed-wallets')
      toast.success(res.data.message)
      fetchData()
    } catch { toast.error('Seed failed') }
    finally { setSeeding(false) }
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

  async function submitManualPayout() {
    if (!manualTarget || !manualRef.trim()) return
    setPaying(true)
    try {
      const res = await axios.post('/api/admin/payouts/manual', {
        sellerId:    manualTarget.sellerId,
        referenceId: manualRef.trim(),
        method:      manualMethod,
        notes:       manualNotes.trim() || undefined,
        amount:      manualTarget.availableBalance,
      })
      toast.success(res.data.message)
      setManualTarget(null)
      setManualRef('')
      setManualNotes('')
      fetchData()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed')
    } finally {
      setPaying(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Payouts</h1>
          <p className="text-sm text-gray-500">Settlement management & payout history</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={seedWallets} disabled={seeding}
            className="flex items-center gap-2 border border-violet-300 text-violet-700 hover:bg-violet-50 disabled:opacity-60 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all">
            {seeding ? 'Seeding…' : '⚡ Seed Demo Data'}
          </button>
          <button onClick={runSettlement} disabled={running}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
            {running
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</>
              : <><FiPlay /> Run Settlement</>}
          </button>
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Paid Out',         value: formatPrice(stats.totalPaidOut),   icon: FiCheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Available Now',           value: formatPrice(stats.totalAvailable), icon: FiDollarSign,  color: 'text-violet-600 bg-violet-50' },
            { label: 'Pending (return window)', value: formatPrice(stats.totalPending),   icon: FiClock,       color: 'text-amber-600 bg-amber-50' },
            { label: 'Eligible Sellers',        value: stats.sellersEligible,             icon: FiUsers,       color: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}><Icon /></div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manual payout tip */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800 flex items-start gap-2">
        <FiSend className="mt-0.5 flex-shrink-0" />
        <p><strong>Manual Payout:</strong> Transfer money to seller via eSewa/bank, then click <strong>Pay Manually</strong> and enter the transaction reference. The system will record it as paid.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seller Wallets */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Seller Balances</h2>
            <p className="text-xs text-gray-500">Click "Pay Manually" after sending money to a seller</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {wallets.map((w, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{w.seller.name}</p>
                    <p className="text-xs text-gray-400">{w.seller.email}</p>
                    {w.bank ? (
                      <p className="text-xs mt-1">
                        {w.bank.kycStatus === 'verified'
                          ? <span className="text-green-600">✓ {w.bank.bankName} ••••{w.bank.accountLast4}</span>
                          : <span className="text-amber-600 flex items-center gap-0.5"><FiAlertCircle className="text-xs" /> KYC {w.bank.kycStatus}</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-red-500 mt-1">No bank account added</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">{formatPrice(w.availableBalance)}</p>
                    <p className="text-xs text-gray-400">available</p>
                    <p className="text-xs text-amber-600">{formatPrice(w.pendingBalance)} pending</p>
                    {w.availableBalance >= 100 && (
                      <button
                        onClick={() => { setManualTarget(w); setManualRef(''); setManualNotes('') }}
                        className="mt-2 flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FiSend className="text-xs" /> Pay Manually
                      </button>
                    )}
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
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {payouts.map((payout) => (
              <div key={payout._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{payout.seller.name}</p>
                    <p className="text-xs text-gray-400">{payout.bankName} ••••{payout.accountLast4}</p>
                    <p className="text-xs text-gray-400">{formatDate(payout.initiatedAt)}</p>
                    {payout.referenceId && <p className="text-xs font-mono text-gray-500">Ref: {payout.referenceId}</p>}
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
              <div className="py-8 text-center text-sm text-gray-400">No payouts yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Payout Modal */}
      {manualTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Record Manual Payout</h2>
              <button onClick={() => setManualTarget(null)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </div>

            {/* Seller info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-gray-900">{manualTarget.seller.name}</p>
              <p className="text-xs text-gray-500">{manualTarget.seller.email}</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatPrice(manualTarget.availableBalance)}</p>
              <p className="text-xs text-gray-500">Amount to pay</p>
            </div>

            {/* Send money TO section */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-amber-800 mb-2">📤 Send money to:</p>
              {manualTarget.bank ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{manualTarget.bank.accountHolderName}</p>
                  {manualTarget.bank.mobileWallet && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                        {manualTarget.bank.walletType === 'esewa' ? 'eSewa' : manualTarget.bank.walletType === 'khalti' ? 'Khalti' : 'Wallet'}
                      </span>
                      <p className="text-base font-bold text-gray-900 tracking-widest">{manualTarget.bank.mobileWallet}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-600">{manualTarget.bank.bankName} — ••••{manualTarget.bank.accountLast4}</p>
                  {manualTarget.bank.kycStatus !== 'verified' && (
                    <p className="text-xs text-red-500 font-medium">⚠ KYC not verified — pay with caution</p>
                  )}
                </div>
              ) : (
                <div className="text-xs text-red-600 font-medium">
                  ⚠ No bank account added by this seller.<br/>
                  Ask seller to add their eSewa/bank details first at /seller/earnings
                </div>
              )}
            </div>

            {/* Step instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-800">
              <p className="font-semibold mb-1">Steps:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Send {formatPrice(manualTarget.availableBalance)} to the number/account above</li>
                <li>Copy the transaction reference/ID from your app</li>
                <li>Paste it below and confirm</li>
              </ol>
            </div>

            {/* Transfer method */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Method</label>
              <div className="flex gap-2 flex-wrap">
                {['eSewa', 'Khalti', 'Bank Transfer', 'Cash'].map((m) => (
                  <button key={m} onClick={() => setManualMethod(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${manualMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference ID */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Reference ID <span className="text-red-500">*</span>
              </label>
              <input
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder={manualMethod === 'eSewa' ? 'e.g. 0006PL9' : manualMethod === 'Khalti' ? 'e.g. TXN123456' : 'e.g. NABIL-20240605-001'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g. Paid via eSewa personal"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setManualTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={submitManualPayout}
                disabled={!manualRef.trim() || paying}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {paying ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : <><FiCheckCircle /> Confirm Paid</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
