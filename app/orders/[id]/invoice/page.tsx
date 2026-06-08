'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { formatDate } from '@/lib/utils'

interface OrderItem {
  title: string
  image: string
  price: number
  quantity: number
  product: string
  variantLabel?: string
}

interface InvoiceOrder {
  _id: string
  orderNumber?: string
  status: string
  paymentStatus: string
  paymentMethod?: string
  createdAt: string
  shippedAt?: string
  deliveredAt?: string
  trackingNumber?: string
  trackingCarrier?: string
  subtotal: number
  shippingCost: number
  discount: number
  tax?: number
  totalAmount: number
  items: OrderItem[]
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    phone: string
  }
}

export default function InvoicePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [order, setOrder] = useState<InvoiceOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/orders/${id}`)
      .then(r => setOrder(r.data.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
    </div>
  )
  if (!order) return null

  const addr = order.shippingAddress
  const orderNum = order.orderNumber || id.slice(-8).toUpperCase()
  const invoiceDate = formatDate(order.createdAt)

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden bg-gray-100 px-6 py-3 flex items-center justify-between border-b">
        <span className="text-sm text-gray-600">Invoice #{orderNum}</span>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-gray-900 hover:bg-gray-700 text-white font-bold px-5 py-2 rounded-full text-sm transition-colors"
          >
            Save as PDF / Print
          </button>
          <button
            onClick={() => { window.close(); router.push(`/orders/${id}`) }}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-full text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="max-w-2xl mx-auto px-8 py-10 bg-white min-h-screen print:min-h-0 print:max-w-full print:px-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Prime<span className="text-orange-500">Pasal</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Nepal's Online Marketplace</p>
            <p className="text-xs text-gray-400">pasalprime@gmail.com · 9801772670</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">INVOICE</p>
            <p className="text-sm text-gray-600 mt-1">#{orderNum}</p>
            <p className="text-xs text-gray-400">{invoiceDate}</p>
            <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {order.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900">{addr?.name || '—'}</p>
            <p className="text-sm text-gray-600">{addr?.street}</p>
            <p className="text-sm text-gray-600">{[addr?.city, addr?.state, addr?.zipCode].filter(Boolean).join(', ')}</p>
            <p className="text-sm text-gray-600">Nepal</p>
            {addr?.phone && <p className="text-sm text-gray-600 mt-1">{addr.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Order Details</p>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p><span className="text-gray-400">Order #:</span> <span className="font-mono font-bold text-gray-900">{orderNum}</span></p>
              <p><span className="text-gray-400">Date:</span> {invoiceDate}</p>
              <p><span className="text-gray-400">Payment:</span> <span className="capitalize">{order.paymentMethod?.replace(/_/g, ' ') || order.paymentStatus}</span></p>
              {order.trackingNumber && (
                <p><span className="text-gray-400">Tracking:</span> <span className="font-mono">{order.trackingNumber}</span></p>
              )}
              {order.trackingCarrier && (
                <p><span className="text-gray-400">Carrier:</span> {order.trackingCarrier}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-4 py-3 font-semibold rounded-tl-lg">Item</th>
              <th className="text-center px-4 py-3 font-semibold">Qty</th>
              <th className="text-right px-4 py-3 font-semibold">Unit Price</th>
              <th className="text-right px-4 py-3 font-semibold rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">Rs. {Math.round(item.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {Math.round(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rs. {Math.round(order.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{!order.shippingCost ? 'FREE' : `Rs. ${Math.round(order.shippingCost).toLocaleString()}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-Rs. {Math.round(order.discount).toLocaleString()}</span>
              </div>
            )}
            {Number(order.tax) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>Rs. {Math.round(order.tax ?? 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2 mt-2 text-gray-900">
              <span>Total</span>
              <span>Rs. {Math.round(order.totalAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-600">Thank you for shopping with PrimePasal!</p>
          <p>For questions about this order, contact us at pasalprime@gmail.com or call 9801772670</p>
          <p className="mt-2">© {new Date().getFullYear()} PrimePasal. All rights reserved. · www.primepasal.com</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          html, body { height: auto !important; min-height: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; size: A4 portrait; }
          header, footer, nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
