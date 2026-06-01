'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiSettings, FiDollarSign, FiTruck, FiAlertCircle, FiCheck, FiX } from 'react-icons/fi'

interface CODOrder {
  _id: string
  orderNumber: string
  user: { name: string; phone?: string }
  totalAmount: number
  codCollected: boolean
  codCollectedAt?: string
  codRemittanceStatus: string
  status: string
  deliveryAttempts: number
  deliveryFailureReason?: string
  createdAt: string
}

interface CODSettings {
  maxOrderValue: number
  handlingFee: number
  handlingFeeType: string
  isEnabled: boolean
  otpRequired: boolean
}

const STATUS_COLOR: Record<string, string> = {
  out_for_delivery: 'bg-blue-100 text-blue-700',
  delivered:        'bg-green-100 text-green-700',
  delivery_failed:  'bg-amber-100 text-amber-700',
  refused:          'bg-red-100 text-red-700',
  cancelled:        'bg-gray-100 text-gray-600',
}

export default function AdminCODPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<CODOrder[]>([])
  const [settings, setSettings] = useState<CODSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<Partial<CODSettings>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [tab, setTab] = useState<'orders' | 'settings'>('orders')

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') { router.push('/'); return }
    fetchData()
  }, [user, authLoading])

  async function fetchData() {
    setLoading(true)
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        axios.get('/api/admin/orders?paymentMethod=cod&limit=100'),
        axios.get('/api/cod/settings'),
      ])
      setOrders(ordersRes.data.data || [])
      setSettings(settingsRes.data.data)
      setSettingsForm(settingsRes.data.data)
    } catch { toast.error('Failed to load COD data') }
    finally { setLoading(false) }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await axios.put('/api/cod/settings', settingsForm)
      toast.success('COD settings saved!')
      setEditSettings(false)
      fetchData()
    } catch { toast.error('Failed to save settings') }
    finally { setSavingSettings(false) }
  }

  if (authLoading || loading) return <LoadingSpinner fullPage />

  const totalCollected   = orders.filter((o) => o.codCollected).reduce((s, o) => s + o.totalAmount, 0)
  const totalPending     = orders.filter((o) => !o.codCollected && o.status !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0)
  const failedOrders     = orders.filter((o) => ['delivery_failed', 'refused'].includes(o.status))
  const toRemit          = orders.filter((o) => o.codCollected && o.codRemittanceStatus === 'pending')

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">COD Management</h1>
      <p className="text-sm text-gray-500 mb-6">Cash on Delivery orders, collection tracking & reconciliation</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total COD Orders', value: orders.length, icon: FiTruck, color: 'text-violet-600 bg-violet-50' },
          { label: 'Cash Collected', value: formatPrice(totalCollected), icon: FiCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Pending Collection', value: formatPrice(totalPending), icon: FiDollarSign, color: 'text-amber-600 bg-amber-50' },
          { label: 'Pending Remittance', value: toRemit.length + ' orders', icon: FiAlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}><Icon /></div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['orders', 'settings'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t === 'settings' ? <><FiSettings className="inline mr-1" />Settings</> : 'COD Orders'}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">All COD Orders</h2>
            {failedOrders.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                {failedOrders.length} failed/refused
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Order #', 'Customer', 'Amount', 'Status', 'Collected', 'Remittance', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{order.user?.name}</p>
                      {order.deliveryFailureReason && <p className="text-xs text-red-500">{order.deliveryFailureReason}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatPrice(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      {order.deliveryAttempts > 0 && <p className="text-xs text-gray-400 mt-0.5">{order.deliveryAttempts} attempt(s)</p>}
                    </td>
                    <td className="px-4 py-3">
                      {order.codCollected
                        ? <span className="text-green-600 text-xs font-bold">✓ {order.codCollectedAt ? formatDate(order.codCollectedAt) : ''}</span>
                        : <span className="text-amber-600 text-xs">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.codRemittanceStatus === 'remitted' ? 'bg-green-100 text-green-700' :
                        order.codRemittanceStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{order.codRemittanceStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No COD orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && settings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">COD Settings</h2>
            <button onClick={() => setEditSettings(!editSettings)} className="text-violet-600 text-sm font-medium hover:underline">
              {editSettings ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={saveSettings} className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">COD Enabled</p>
                <p className="text-xs text-gray-500">Allow cash on delivery globally</p>
              </div>
              <input type="checkbox" checked={settingsForm.isEnabled ?? true}
                onChange={(e) => setSettingsForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                disabled={!editSettings} className="w-5 h-5 accent-violet-600" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Order Value (Rs.)</label>
              <input type="number" value={settingsForm.maxOrderValue ?? ''} disabled={!editSettings}
                onChange={(e) => setSettingsForm((p) => ({ ...p, maxOrderValue: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50" />
              <p className="text-xs text-gray-400 mt-1">COD blocked above this amount</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Handling Fee</label>
                <input type="number" value={settingsForm.handlingFee ?? ''} disabled={!editSettings}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, handlingFee: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fee Type</label>
                <select value={settingsForm.handlingFeeType ?? 'fixed'} disabled={!editSettings}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, handlingFeeType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50">
                  <option value="fixed">Fixed (Rs.)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">Require OTP for COD</p>
                <p className="text-xs text-gray-500">Reduce fake orders via phone verification</p>
              </div>
              <input type="checkbox" checked={settingsForm.otpRequired ?? false}
                onChange={(e) => setSettingsForm((p) => ({ ...p, otpRequired: e.target.checked }))}
                disabled={!editSettings} className="w-5 h-5 accent-violet-600" />
            </div>

            {editSettings && (
              <button type="submit" disabled={savingSettings}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                {savingSettings ? 'Saving…' : 'Save Settings'}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
