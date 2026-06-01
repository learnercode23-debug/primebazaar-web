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
import { FiPackage, FiChevronRight } from 'react-icons/fi'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    axios.get('/api/orders').then((r) => setOrders(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Sign in to view your orders</p>
        <Link href="/login" className="bg-amazon-yellow text-gray-900 font-bold px-6 py-2.5 rounded-full">Sign In</Link>
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
          <Link href="/products" className="bg-amazon-yellow text-gray-900 font-bold px-6 py-2.5 rounded-full">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Order header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Order Placed</p>
                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Total</p>
                    <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Order #</p>
                    <p className="font-medium font-mono text-xs">{order._id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <Link href={`/orders/${order._id}`} className="text-amazon-teal hover:underline flex items-center gap-1 text-sm">
                    Details <FiChevronRight />
                  </Link>
                </div>
              </div>

              {/* Order items */}
              <div className="px-4 py-3 space-y-3">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 bg-gray-50 rounded flex-shrink-0">
                      <Image src={item.image || 'https://via.placeholder.com/100'} alt={item.title} fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} · {formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-xs text-gray-500">+{order.items.length - 3} more items</p>
                )}
              </div>

              {/* Tracking */}
              {order.trackingNumber && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-500">
                    Tracking: <span className="font-mono font-medium text-gray-700">{order.trackingNumber}</span>
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
