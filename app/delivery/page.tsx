'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiMapPin, FiPhone, FiCheck, FiX, FiAlertCircle, FiCalendar } from 'react-icons/fi'

interface CODOrder {
  _id: string
  orderNumber: string
  user: { name: string; phone?: string }
  shippingAddress: { name: string; street: string; city: string; state: string; phone: string }
  totalAmount: number
  status: string
  deliveryAttempts: number
  createdAt: string
}

export default function DeliveryAgentPage() {
  const [orders, setOrders] = useState<CODOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [totalToCollect, setTotalToCollect] = useState(0)
  const [agentName, setAgentName] = useState('')
  const [actionOrder, setActionOrder] = useState<CODOrder | null>(null)
  const [action, setAction] = useState<'delivered' | 'failed' | 'refused' | null>(null)
  const [failureReason, setFailureReason] = useState('')
  const [nextAttemptDate, setNextAttemptDate] = useState('')
  const [collectedAmount, setCollectedAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await axios.get('/api/delivery/orders')
      setOrders(res.data.data || [])
      setTotalToCollect(res.data.totalToCollect || 0)
      setAgentName(res.data.agentName || '')
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }

  async function submitAction() {
    if (!actionOrder || !action) return
    setSubmitting(true)
    try {
      await axios.put('/api/delivery/orders', {
        orderId: actionOrder._id,
        action,
        failureReason,
        nextAttemptDate,
        collectedAmount: collectedAmount ? Number(collectedAmount) : undefined,
      })
      toast.success(`Order marked as ${action}`)
      setActionOrder(null); setAction(null); setFailureReason(''); setNextAttemptDate(''); setCollectedAmount('')
      fetchOrders()
    } catch { toast.error('Failed to update order') }
    finally { setSubmitting(false) }
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white mb-5">
        <p className="text-sm opacity-75">Delivery Agent</p>
        <h1 className="text-xl font-bold">{agentName || 'Agent Dashboard'}</h1>
        <div className="mt-3 flex gap-4">
          <div><p className="text-xs opacity-75">Orders Today</p><p className="text-2xl font-black">{orders.length}</p></div>
          <div><p className="text-xs opacity-75">Cash to Collect</p><p className="text-2xl font-black">{formatPrice(totalToCollect)}</p></div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-gray-400">
          <FiCheck className="text-4xl mx-auto mb-2 text-green-500" />
          <p className="font-semibold">All deliveries done!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">{formatPrice(order.totalAmount)}</p>
                  <p className="text-xs text-amber-600 font-medium">Collect on delivery</p>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600 flex gap-2">
                <FiMapPin className="text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.street}, {order.shippingAddress.city}</p>
                  <a href={`tel:${order.shippingAddress.phone}`} className="flex items-center gap-1 text-violet-600 mt-1 font-medium">
                    <FiPhone className="text-xs" /> {order.shippingAddress.phone}
                  </a>
                </div>
              </div>

              {order.deliveryAttempts > 0 && (
                <p className="text-xs text-amber-600 mb-2">⚠️ Attempt {order.deliveryAttempts + 1} — Previous: {order.status.replace(/_/g, ' ')}</p>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { setActionOrder(order); setAction('delivered') }}
                  className="flex flex-col items-center gap-1 bg-green-50 border border-green-200 text-green-700 rounded-xl py-2.5 text-xs font-bold hover:bg-green-100 transition-all">
                  <FiCheck className="text-base" /> Delivered
                </button>
                <button onClick={() => { setActionOrder(order); setAction('failed') }}
                  className="flex flex-col items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl py-2.5 text-xs font-bold hover:bg-amber-100 transition-all">
                  <FiAlertCircle className="text-base" /> Failed
                </button>
                <button onClick={() => { setActionOrder(order); setAction('refused') }}
                  className="flex flex-col items-center gap-1 bg-red-50 border border-red-200 text-red-700 rounded-xl py-2.5 text-xs font-bold hover:bg-red-100 transition-all">
                  <FiX className="text-base" /> Refused
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {actionOrder && action && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg capitalize">
              {action === 'delivered' ? '✅ Mark as Delivered' : action === 'failed' ? '⚠️ Delivery Failed' : '❌ Customer Refused'}
            </h3>

            {action === 'delivered' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Collected (Rs.)</label>
                <input type="number" value={collectedAmount}
                  onChange={(e) => setCollectedAmount(e.target.value)}
                  placeholder={String(actionOrder.totalAmount)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            )}

            {(action === 'failed' || action === 'refused') && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                  <select value={failureReason} onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Select reason</option>
                    {action === 'failed' ? (
                      <>
                        <option>Customer not available</option>
                        <option>Wrong address</option>
                        <option>Customer requested reschedule</option>
                        <option>Area inaccessible</option>
                      </>
                    ) : (
                      <>
                        <option>Customer refused to pay</option>
                        <option>Customer not interested</option>
                        <option>Item not as expected</option>
                        <option>Duplicate order</option>
                      </>
                    )}
                  </select>
                </div>
                {action === 'failed' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><FiCalendar className="text-xs" /> Next Attempt Date</label>
                    <input type="date" value={nextAttemptDate} onChange={(e) => setNextAttemptDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setActionOrder(null); setAction(null) }}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitAction} disabled={submitting}
                className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 ${
                  action === 'delivered' ? 'bg-green-600 hover:bg-green-700' :
                  action === 'refused' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}>
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
