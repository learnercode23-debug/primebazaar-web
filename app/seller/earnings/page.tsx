'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  FiDollarSign, FiClock, FiCheckCircle, FiTrendingUp,
  FiPlus, FiAlertCircle, FiCalendar, FiCreditCard
} from 'react-icons/fi'

interface Wallet {
  totalEarned: number
  pendingBalance: number
  availableBalance: number
  paidOutBalance: number
  lastSettledAt?: string
}

interface LedgerEntry {
  _id: string
  orderNumber: string
  itemTitle: string
  grossAmount: number
  commissionRate: number
  commissionFee: number
  collectionFee: number
  netEarning: number
  status: string
  availableAt: string
  createdAt: string
}

interface Payout {
  _id: string
  amount: number
  bankName: string
  accountLast4: string
  status: string
  referenceId?: string
  initiatedAt: string
  completedAt?: string
}

interface BankAccount {
  _id: string
  accountHolderName: string
  bankName: string
  accountLast4: string
  walletType: string
  kycStatus: string
  isDefault: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  available: 'bg-green-100 text-green-700',
  paid:      'bg-blue-100 text-blue-700',
  refunded:  'bg-red-100 text-red-700',
}

const PAYOUT_COLORS: Record<string, string> = {
  initiated:  'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  success:    'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
}

export default function SellerEarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [nextPayoutDate, setNextPayoutDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    walletType: 'bank',
    mobileWallet: '',
  })
  const [savingBank, setSavingBank] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'seller') { router.push('/'); return }
    fetchData()
  }, [user, authLoading])

  async function fetchData() {
    setLoading(true)
    try {
      const [walletRes, bankRes] = await Promise.all([
        axios.get('/api/seller/wallet'),
        axios.get('/api/seller/bank-account'),
      ])
      setWallet(walletRes.data.data.wallet)
      setLedger(walletRes.data.data.ledger || [])
      setPayouts(walletRes.data.data.payouts || [])
      setNextPayoutDate(walletRes.data.data.nextPayoutDate)
      setBankAccounts(bankRes.data.data || [])
    } catch {
      toast.error('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  async function saveBankAccount(e: React.FormEvent) {
    e.preventDefault()
    setSavingBank(true)
    try {
      await axios.post('/api/seller/bank-account', bankForm)
      toast.success('Bank account saved! KYC verification pending.')
      setShowBankForm(false)
      fetchData()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save')
    } finally {
      setSavingBank(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />
  if (!wallet) return null

  const STAT_CARDS = [
    { label: 'Total Earned', value: formatPrice(wallet.totalEarned), icon: FiTrendingUp, color: 'bg-violet-50 text-violet-700', border: 'border-violet-200' },
    { label: 'Pending', value: formatPrice(wallet.pendingBalance), icon: FiClock, color: 'bg-amber-50 text-amber-700', border: 'border-amber-200', hint: `In ${7}-day return window` },
    { label: 'Available', value: formatPrice(wallet.availableBalance), icon: FiCheckCircle, color: 'bg-green-50 text-green-700', border: 'border-green-200', hint: 'Ready for payout' },
    { label: 'Paid Out', value: formatPrice(wallet.paidOutBalance), icon: FiDollarSign, color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your sales, fees, and settlements</p>
        </div>
        {nextPayoutDate && (
          <div className="hidden sm:flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 text-sm">
            <FiCalendar className="text-violet-600" />
            <div>
              <p className="text-xs text-gray-500">Next payout</p>
              <p className="font-semibold text-violet-700">{new Date(nextPayoutDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, border, hint }) => (
          <div key={label} className={`bg-white border rounded-xl p-4 ${border}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
              <Icon className="text-lg" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Earnings Ledger</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fee breakdown per delivered order</p>
            </div>

            {ledger.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FiDollarSign className="text-3xl mx-auto mb-2" />
                <p>No earnings yet. They appear when your orders are delivered.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {ledger.map((entry) => (
                  <div key={entry._id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{entry.itemTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Order #{entry.orderNumber} · {formatDate(entry.createdAt)}</p>

                        {/* Fee breakdown */}
                        <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs space-y-1">
                          <div className="flex justify-between text-gray-600">
                            <span>Sale amount</span>
                            <span className="font-medium">{formatPrice(entry.grossAmount)}</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>Commission ({entry.commissionRate}%)</span>
                            <span>-{formatPrice(entry.commissionFee)}</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>Collection fee (2%)</span>
                            <span>-{formatPrice(entry.collectionFee)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                            <span>Net earning</span>
                            <span className="text-green-600">{formatPrice(entry.netEarning)}</span>
                          </div>
                        </div>

                        {entry.status === 'pending' && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <FiClock className="text-xs" />
                            Available {new Date(entry.availableAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Bank + Payouts */}
        <div className="space-y-4">
          {/* Bank Account */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><FiCreditCard /> Bank Details</h2>
              <button onClick={() => setShowBankForm(!showBankForm)} className="text-violet-600 text-xs font-medium flex items-center gap-1">
                <FiPlus /> Add
              </button>
            </div>

            {bankAccounts.length === 0 && !showBankForm && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">Add your bank details to receive payouts</p>
                <button onClick={() => setShowBankForm(true)} className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                  Add Bank Account
                </button>
              </div>
            )}

            {bankAccounts.map((acct) => (
              <div key={acct._id} className="border border-gray-100 rounded-xl p-3 mb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{acct.bankName}</p>
                    <p className="text-xs text-gray-500">{acct.accountHolderName}</p>
                    <p className="text-xs text-gray-400">••••{acct.accountLast4}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    acct.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                    acct.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {acct.kycStatus === 'verified' ? '✓ KYC Verified' : acct.kycStatus === 'rejected' ? 'KYC Rejected' : 'KYC Pending'}
                  </span>
                </div>
              </div>
            ))}

            {showBankForm && (
              <form onSubmit={saveBankAccount} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Type</label>
                  <select value={bankForm.walletType} onChange={(e) => setBankForm((p) => ({ ...p, walletType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="bank">Bank Account</option>
                    <option value="esewa">eSewa</option>
                    <option value="khalti">Khalti</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Account Holder Name</label>
                  <input value={bankForm.accountHolderName} onChange={(e) => setBankForm((p) => ({ ...p, accountHolderName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Full name" required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {bankForm.walletType === 'bank' ? 'Bank Name' : bankForm.walletType === 'esewa' ? 'eSewa ID' : 'Khalti Number'}
                  </label>
                  <input value={bankForm.bankName} onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder={bankForm.walletType === 'bank' ? 'e.g. Nepal Investment Bank' : bankForm.walletType === 'esewa' ? '98XXXXXXXX' : '98XXXXXXXX'}
                    required />
                </div>

                {bankForm.walletType === 'bank' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Account Number</label>
                    <input value={bankForm.accountNumber} onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Account number" required type="password" />
                    <p className="text-xs text-gray-400 mt-0.5">Only the last 4 digits are stored for display</p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 flex items-start gap-1">
                    <FiAlertCircle className="flex-shrink-0 mt-0.5" />
                    KYC verification required before first payout. Admin will verify your details within 2-3 business days.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={savingBank}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2 rounded-xl text-sm transition-all">
                    {savingBank ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowBankForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Payout History</h2>
            {payouts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No payouts yet</p>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div key={payout._id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900">{formatPrice(payout.amount)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYOUT_COLORS[payout.status] || 'bg-gray-100 text-gray-600'}`}>
                        {payout.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{payout.bankName} ••••{payout.accountLast4}</p>
                    <p className="text-xs text-gray-400">{formatDate(payout.initiatedAt)}</p>
                    {payout.referenceId && <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {payout.referenceId}</p>}
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
