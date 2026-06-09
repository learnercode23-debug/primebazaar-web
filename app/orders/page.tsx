'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { Order } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPackage, FiChevronRight, FiCheck, FiX } from 'react-icons/fi'

// Full status progression for timeline
const STEPS = [
  { key: 'pending',           label: 'Order Placed',     icon: '📋' },
  { key: 'confirmed',         label: 'Confirmed',        icon: '✅' },
  { key: 'processing',        label: 'Processing',       icon: '⚙️' },
  { key: 'packed',            label: 'Packed',           icon: '📦' },
  { key: 'shipped',           label: 'Shipped',          icon: '🚚' },
  { key: 'out_for_delivery',  label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered',         label: 'Delivered',        icon: '🏠' },
]

function getStepIndex(status: string) {
  const idx = STEPS.findIndex(s => s.key === status)
  return idx === -1 ? 0 : idx
}

function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled' || status === 'returned' || status === 'refused' || status === 'delivery_failed') {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <FiX className="text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700 capitalize">{status.replace(/_/g, ' ')}</span>
        </div>
      </div>
    )
  }

  const currentIdx = getStepIndex(status)

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentIdx
          const active = i === currentIdx
          const isLast = i === STEPS.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              {/* Circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all
                  ${done ? 'bg-violet-600 border-violet-600 text-white'
                    : active ? 'bg-white border-violet-600 text-violet-600 shadow-md shadow-violet-200'
                    : 'bg-white border-gray-200 text-gray-300'}`}
                >
                  {done ? <FiCheck className="text-xs" /> : <span>{step.icon}</span>}
                </div>
                <span className={`text-[9px] mt-1 text-center leading-tight hidden sm:block whitespace-nowrap
                  ${done || active ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-0.5 ${i < currentIdx ? 'bg-violet-600' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      {/* Mobile active label */}
      <p className="sm:hidden text-xs text-center text-violet-700 font-bold mt-2">
        {STEPS[currentIdx]?.label}
      </p>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-800',
  confirmed:        'bg-blue-100 text-blue-800',
  processing:       'bg-purple-100 text-purple-800',
  packed:           'bg-indigo-100 text-indigo-800',
  shipped:          'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-amber-100 text-amber-800',
  delivered:        'bg-green-100 text-green-800',
  cancelled:        'bg-red-100 text-red-800',
  returned:         'bg-gray-100 text-gray-700',
  refused:          'bg-red-100 text-red-800',
  delivery_failed:  'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    axios.get('/api/orders').then((r) => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Sign in to view your orders</p>
        <Link href="/login" className="btn-gradient px-6 py-2.5 rounded-full text-sm font-bold">Sign In</Link>
      </div>
    </div>
  )

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">When you place orders, they&apos;ll appear here.</p>
          <Link href="/products" className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-6 py-2.5 rounded-full transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-violet-100 hover:border-violet-200 transition-all">

              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-violet-50/30 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold">Order Placed</p>
                    <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold">Total</p>
                    <p className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold">Order #</p>
                    <p className="font-mono font-semibold text-xs text-violet-700">{order.orderNumber || order._id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  <Link href={`/orders/${order._id}`} className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors">
                    Details <FiChevronRight />
                  </Link>
                </div>
              </div>

              {/* Tracking timeline */}
              <div className="pt-4">
                <OrderTimeline status={order.status} />
              </div>

              {/* Items */}
              <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl flex-shrink-0 overflow-hidden">
                      <Image src={item.image || 'https://via.placeholder.com/100'} alt={item.title} fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} · {formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-xs text-gray-400 font-medium">+{order.items.length - 3} more items</p>
                )}
              </div>

              {/* Tracking number */}
              {order.trackingNumber && (
                <div className="px-4 pb-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mt-2">
                    Tracking: <span className="font-mono font-semibold text-gray-700">{order.trackingNumber}</span>
                    {order.trackingCarrier && <span className="text-gray-400"> via {order.trackingCarrier}</span>}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
