'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { formatPrice } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface OrderSummary {
  _id: string
  orderNumber: string
  totalAmount: number
  status: string
  paymentMethod: string
  items: Array<{ title: string; quantity: number; price: number }>
  trackingNumber?: string
}

const METHOD_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  esewa: { name: 'eSewa', icon: '', color: 'text-green-600 bg-green-50 border-green-200' },
  khalti: { name: 'Khalti', icon: '', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  cod: { name: 'Cash on Delivery', icon: '', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  card: { name: 'Credit / Debit Card', icon: '', color: 'text-blue-600 bg-blue-50 border-blue-200' },
}

function SuccessContent() {
  const params = useSearchParams()
  const orderId = params.get('orderId')
  const method = params.get('method') || 'card'
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) { setLoading(false); return }
    axios.get(`/api/orders/${orderId}`)
      .then((r) => setOrder(r.data.data))
      .finally(() => setLoading(false))
  }, [orderId])

  const methodInfo = METHOD_LABELS[method] || METHOD_LABELS.card

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Success icon */}
      <div className="relative mx-auto w-24 h-24 mb-6">
        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40" />
        <div className="relative flex items-center justify-center w-24 h-24 bg-green-500 rounded-full shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
      <p className="text-gray-500 mb-6">Your order has been confirmed and is being processed.</p>

      {/* Payment method badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-6 ${methodInfo.color}`}>
        {method === 'esewa' && <span className="font-black">e</span>}
        {method === 'khalti' && <span className="font-black text-purple-700">K</span>}
        {method === 'cod' && <span>💵</span>}
        {method === 'cod' ? 'Cash on Delivery' : `Paid via ${methodInfo.name}`}
      </div>

      {/* Order details */}
      {loading ? (
        <div className="flex justify-center my-8"><LoadingSpinner /></div>
      ) : order ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Order Number</p>
              <p className="font-mono font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Paid</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Tracking Number</p>
              <p className="font-mono font-bold text-sm text-gray-900">{order.trackingNumber}</p>
            </div>
          )}

          <div className="space-y-2 border-t border-gray-100 pt-4">
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate max-w-[200px]">{item.title} × {item.quantity}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="w-full bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-full transition-colors"
          >
            View Order Details →
          </Link>
        )}
        <Link href="/orders" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-full transition-colors">
          My Orders
        </Link>
        <Link href="/" className="text-amazon-teal text-sm hover:underline">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <SuccessContent />
    </Suspense>
  )
}
