'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  FiSearch, FiFilter, FiCheck, FiX, FiTruck, FiPackage,
  FiRefreshCw, FiAlertTriangle, FiCalendar, FiChevronDown,
  FiClock, FiMapPin, FiUser, FiHash, FiInfo, FiCheckCircle
} from 'react-icons/fi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  product: string
  title: string
  image: string
  price: number
  quantity: number
  seller: string
  variantLabel?: string
  sku?: string
}

interface ShippingAddress {
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
}

interface SellerOrder {
  _id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  items: OrderItem[]
  user: { name: string; email: string; phone?: string }
  shippingAddress: ShippingAddress
  subtotal: number
  totalAmount: number
  createdAt: string
  acceptedAt?: string
  packedAt?: string
  shippedAt?: string
  deliveredAt?: string
  rejectedAt?: string
  rejectionReason?: string
  trackingNumber?: string
  trackingCarrier?: string
  estimatedDelivery?: string
  stockWarnings: Record<string, number>
}

interface Counts {
  all: number
  new: number
  accepted: number
  packed: number
  shipped: number
  delivered: number
  cancelled: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'confirmed', label: 'New',       countKey: 'new',       color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'processing', label: 'Accepted',  countKey: 'accepted',  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'packed',     label: 'Packed',    countKey: 'packed',    color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { key: 'shipped',    label: 'Shipped',   countKey: 'shipped',   color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'delivered',  label: 'Delivered', countKey: 'delivered', color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'cancelled',  label: 'Cancelled', countKey: 'cancelled', color: 'text-red-600 bg-red-50 border-red-200' },
] as const

type TabStatus = typeof TABS[number]['key']

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{className?: string}> }> = {
  confirmed:  { label: 'New Order',  bg: 'bg-orange-100', text: 'text-orange-700', icon: FiClock },
  processing: { label: 'Accepted',   bg: 'bg-blue-100',   text: 'text-blue-700',   icon: FiCheck },
  packed:     { label: 'Packed',     bg: 'bg-indigo-100', text: 'text-indigo-700', icon: FiPackage },
  shipped:    { label: 'Shipped',    bg: 'bg-purple-100', text: 'text-purple-700', icon: FiTruck },
  delivered:  { label: 'Delivered',  bg: 'bg-green-100',  text: 'text-green-700',  icon: FiCheckCircle },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-100',    text: 'text-red-700',    icon: FiX },
}

const REJECTION_CATEGORIES = [
  { value: 'out_of_stock',   label: 'Out of stock / inventory issue' },
  { value: 'damaged',        label: 'Item is damaged' },
  { value: 'pricing_error',  label: 'Pricing error' },
  { value: 'other',          label: 'Other reason' },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SellerOrdersHub() {
  const { user } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [counts, setCounts] = useState<Counts>({ all: 0, new: 0, accepted: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabStatus>('confirmed')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectCategory, setRejectCategory] = useState('other')
  const [shipModal, setShipModal] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingCarrier, setTrackingCarrier] = useState('')

  // Per-order action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const setOrderLoading = (id: string, val: boolean) =>
    setActionLoading((p) => ({ ...p, [id]: val }))

  // ── Fetch orders ────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      if (search) params.set('search', search)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await axios.get(`/api/seller/orders?${params.toString()}`)
      setOrders(res.data.data || [])
      setCounts(res.data.counts || {})
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, dateFrom, dateTo])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'seller' && user.role !== 'admin') { router.push('/'); return }
    fetchOrders()
  }, [user, router, fetchOrders])

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleAccept(order: SellerOrder) {
    setOrderLoading(order._id, true)
    try {
      await axios.post(`/api/seller/orders/${order._id}/accept`)
      toast.success(`Order ${order.orderNumber} accepted!`)
      fetchOrders()
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; stockIssues?: string[] } } })?.response?.data
      const msg = errData?.stockIssues
        ? `Stock issue: ${errData.stockIssues.join(', ')}`
        : errData?.error || 'Failed to accept order'
      toast.error(msg)
    } finally {
      setOrderLoading(order._id, false)
    }
  }

  function openRejectModal(order: SellerOrder) {
    setRejectModal({ orderId: order._id, orderNumber: order.orderNumber })
    setRejectReason('')
    setRejectCategory('other')
  }

  async function handleReject() {
    if (!rejectModal) return
    if (rejectReason.trim().length < 5) { toast.error('Please provide a reason (min 5 chars)'); return }
    setOrderLoading(rejectModal.orderId, true)
    try {
      await axios.post(`/api/seller/orders/${rejectModal.orderId}/reject`, {
        reason: rejectReason,
        category: rejectCategory,
      })
      toast.success(`Order ${rejectModal.orderNumber} rejected`)
      setRejectModal(null)
      fetchOrders()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed')
    } finally {
      setOrderLoading(rejectModal.orderId, false)
    }
  }

  async function handleStatusUpdate(order: SellerOrder, newStatus: string) {
    setOrderLoading(order._id, true)
    try {
      await axios.put(`/api/seller/orders/${order._id}/status`, {
        status: newStatus,
        trackingNumber: newStatus === 'shipped' ? trackingNumber : undefined,
        carrier: newStatus === 'shipped' ? trackingCarrier : undefined,
      })
      toast.success(`Marked as ${newStatus}`)
      setShipModal(null)
      setTrackingNumber('')
      setTrackingCarrier('')
      fetchOrders()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed')
    } finally {
      setOrderLoading(order._id, false)
    }
  }

  function openShipModal(order: SellerOrder) {
    setShipModal({ orderId: order._id, orderNumber: order.orderNumber })
    setTrackingNumber('')
    setTrackingCarrier('')
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function hasStockIssue(order: SellerOrder): boolean {
    return Object.entries(order.stockWarnings || {}).some(([productId, stock]) => {
      const item = order.items.find((i) => i.product === productId)
      return item && stock < item.quantity
    })
  }

  function getStockWarningText(order: SellerOrder): string {
    const issues: string[] = []
    for (const [productId, stock] of Object.entries(order.stockWarnings || {})) {
      const item = order.items.find((i) => i.product === productId)
      if (item && stock < item.quantity) {
        issues.push(`${item.title.slice(0, 20)}…: ${stock} in stock, need ${item.quantity}`)
      }
    }
    return issues.join('; ')
  }

  if (!user) return <LoadingSpinner fullPage />

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.new > 0
              ? <span className="text-orange-600 font-semibold">{counts.new} new order{counts.new > 1 ? 's' : ''} waiting for your action</span>
              : 'All orders up to date'}
          </p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
          <FiRefreshCw className="text-xs" /> Refresh
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const count = counts[tab.countKey as keyof Counts] || 0
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? tab.key === 'confirmed' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                    : tab.key === 'confirmed' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              placeholder="Search order ID, product, customer…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amazon-orange"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg transition-colors ${showFilters ? 'border-amazon-orange text-amazon-orange bg-orange-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            <FiFilter className="text-xs" /> Filter
            <FiChevronDown className={`text-xs transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={fetchOrders}
            className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Search
          </button>
        </div>

        {/* Date filter */}
        {showFilters && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-400 text-sm flex-shrink-0" />
              <label className="text-sm text-gray-600 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
              />
            </div>
            {(dateFrom || dateTo || search) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); }}
                className="text-sm text-red-500 hover:underline flex items-center gap-1"
              >
                <FiX className="text-xs" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Order list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center px-4">
          <FiPackage className="text-5xl text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No orders</h3>
          <p className="text-sm text-gray-400 mb-4">
            {search ? `No results for "${search}"` : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} orders`}
          </p>
          {!search && activeTab === 'confirmed' && (
            <div className="max-w-sm mx-auto bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
              <p className="text-sm font-semibold text-blue-800 mb-1">💡 How orders appear here</p>
              <p className="text-xs text-blue-700">
                Orders show up only for products you sell. When a customer buys your product via checkout (any payment method),
                the order appears in <strong>New</strong> tab waiting for your action.
                Make sure the product belongs to <strong>your seller account</strong>.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              isLoading={actionLoading[order._id]}
              hasStockIssue={hasStockIssue(order)}
              stockWarningText={getStockWarningText(order)}
              onAccept={() => handleAccept(order)}
              onReject={() => openRejectModal(order)}
              onMarkPacked={() => handleStatusUpdate(order, 'packed')}
              onMarkShipped={() => openShipModal(order)}
              onMarkDelivered={() => handleStatusUpdate(order, 'delivered')}
            />
          ))}
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal title={`Reject Order ${rejectModal.orderNumber}`} onClose={() => setRejectModal(null)}>
          <p className="text-sm text-gray-600 mb-4">
            The customer will be notified. Rejected orders cannot be reversed.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Category</label>
              <select
                value={rejectCategory}
                onChange={(e) => setRejectCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {REJECTION_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why you're rejecting this order (min 5 chars)…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleReject}
              disabled={rejectReason.trim().length < 5 || actionLoading[rejectModal.orderId]}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-full text-sm transition-colors"
            >
              {actionLoading[rejectModal.orderId] ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
            <button onClick={() => setRejectModal(null)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Ship Modal ── */}
      {shipModal && (
        <Modal title={`Ship Order ${shipModal.orderNumber}`} onClose={() => setShipModal(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Enter the tracking details. The customer will receive an email and notification.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA1012345678"
                  className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrier (optional)</label>
              <select
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
              >
                <option value="">Select carrier…</option>
                {['FedEx', 'UPS', 'DHL', 'USPS', 'BlueDart', 'Delhivery', 'Aramex', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => handleStatusUpdate({ _id: shipModal.orderId } as SellerOrder, 'shipped')}
              disabled={!trackingNumber.trim() || actionLoading[shipModal.orderId]}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
            >
              <FiTruck /> {actionLoading[shipModal.orderId] ? 'Updating…' : 'Mark as Shipped'}
            </button>
            <button onClick={() => setShipModal(null)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  isLoading,
  hasStockIssue,
  stockWarningText,
  onAccept,
  onReject,
  onMarkPacked,
  onMarkShipped,
  onMarkDelivered,
}: {
  order: SellerOrder
  isLoading: boolean
  hasStockIssue: boolean
  stockWarningText: string
  onAccept: () => void
  onReject: () => void
  onMarkPacked: () => void
  onMarkShipped: () => void
  onMarkDelivered: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed
  const StatusIcon = cfg.icon

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
      order.status === 'confirmed' ? 'border-orange-200 shadow-orange-50 shadow-sm' : 'border-gray-200'
    }`}>
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status badge */}
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <StatusIcon className="text-xs" /> {cfg.label}
          </span>
          {/* Order number */}
          <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
          {/* Date */}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <FiClock className="text-xs" /> {formatDate(order.createdAt)}
          </span>
          {/* Payment */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {order.paymentStatus} · {order.paymentMethod}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <FiChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products list */}
      <div className="px-4 py-3">
        {order.items.slice(0, expanded ? undefined : 1).map((item, idx) => (
          <div key={idx} className="flex gap-3 items-center py-2 border-b border-gray-50 last:border-0">
            <div className="relative w-14 h-14 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">
              <Image src={item.image || 'https://via.placeholder.com/60'} alt={item.title} fill className="object-contain p-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 line-clamp-1">{item.title}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {item.sku && <span className="text-xs text-gray-400 font-mono">SKU: {item.sku}</span>}
                {item.variantLabel && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.variantLabel}</span>}
                <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                <span className="text-xs font-semibold text-gray-900">{formatPrice(item.price)} each</span>
              </div>
              {/* Stock warning for new orders */}
              {order.status === 'confirmed' && order.stockWarnings?.[item.product] !== undefined && (
                order.stockWarnings[item.product] < item.quantity ? (
                  <div className="flex items-center gap-1 mt-1 text-red-600 text-xs font-medium">
                    <FiAlertTriangle className="text-xs" />
                    Only {order.stockWarnings[item.product]} in stock (need {item.quantity})
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                    <FiCheck className="text-xs" /> {order.stockWarnings[item.product]} in stock ✓
                  </div>
                )
              )}
            </div>
            <div className="text-sm font-bold text-gray-900 flex-shrink-0">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}

        {!expanded && order.items.length > 1 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-amazon-teal hover:underline mt-1">
            +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
          </button>
        )}

        {/* Customer + address (visible when expanded) */}
        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FiUser className="text-xs" /> Customer
              </p>
              <p className="text-sm font-medium text-gray-900">{order.user?.name}</p>
              <p className="text-xs text-gray-500">{order.user?.email}</p>
              {order.user?.phone && <p className="text-xs text-gray-500">{order.user.phone}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FiMapPin className="text-xs" /> Ship to
              </p>
              <p className="text-sm font-medium text-gray-900">{order.shippingAddress.name}</p>
              <p className="text-xs text-gray-600">{order.shippingAddress.street}</p>
              <p className="text-xs text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{order.shippingAddress.phone}</p>
            </div>

            {/* Status timeline */}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Timeline</p>
              <div className="flex items-center gap-0">
                {[
                  { label: 'Placed', time: order.createdAt, done: true },
                  { label: 'Accepted', time: order.acceptedAt, done: !!order.acceptedAt },
                  { label: 'Packed', time: order.packedAt, done: !!order.packedAt },
                  { label: 'Shipped', time: order.shippedAt, done: !!order.shippedAt },
                  { label: 'Delivered', time: order.deliveredAt, done: !!order.deliveredAt },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {step.done ? '✓' : String(i + 1)}
                      </div>
                      <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{step.label}</span>
                      {step.time && <span className="text-xs text-gray-400">{new Date(step.time).toLocaleDateString()}</span>}
                    </div>
                    {i < 4 && <div className={`w-8 h-0.5 mx-0.5 mb-4 ${step.done ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking info */}
            {order.trackingNumber && (
              <div className="sm:col-span-2 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                <p className="text-purple-800 font-semibold flex items-center gap-1">
                  <FiTruck /> Tracking: <span className="font-mono">{order.trackingNumber}</span>
                  {order.trackingCarrier && <span className="text-purple-600">via {order.trackingCarrier}</span>}
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {order.rejectionReason && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                <p className="text-red-700 font-semibold">Rejection reason:</p>
                <p className="text-red-600">{order.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <ActionBar
        order={order}
        isLoading={isLoading}
        hasStockIssue={hasStockIssue}
        stockWarningText={stockWarningText}
        totalItems={totalItems}
        onAccept={onAccept}
        onReject={onReject}
        onMarkPacked={onMarkPacked}
        onMarkShipped={onMarkShipped}
        onMarkDelivered={onMarkDelivered}
      />
    </div>
  )
}

// ── Action Bar (per-status buttons) ──────────────────────────────────────────

function ActionBar({
  order, isLoading, hasStockIssue, stockWarningText, totalItems,
  onAccept, onReject, onMarkPacked, onMarkShipped, onMarkDelivered,
}: {
  order: SellerOrder
  isLoading: boolean
  hasStockIssue: boolean
  stockWarningText: string
  totalItems: number
  onAccept: () => void
  onReject: () => void
  onMarkPacked: () => void
  onMarkShipped: () => void
  onMarkDelivered: () => void
}) {
  if (order.status === 'confirmed') {
    return (
      <div className="px-4 pb-4">
        {hasStockIssue && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 text-xs text-red-700">
            <FiAlertTriangle className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Insufficient stock — cannot accept</p>
              <p className="text-red-500 mt-0.5">{stockWarningText}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            disabled={isLoading || hasStockIssue}
            title={hasStockIssue ? 'Not enough stock to accept' : `Accept ${totalItems} item${totalItems > 1 ? 's' : ''}`}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-full text-sm transition-colors"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiCheck />
            )}
            {hasStockIssue ? 'Cannot Accept (Low Stock)' : isLoading ? 'Accepting…' : `Accept Order`}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex items-center gap-1.5 border-2 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold py-2.5 px-4 rounded-full text-sm transition-colors"
          >
            <FiX /> Reject
          </button>
        </div>
        {hasStockIssue && (
          <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
            <FiInfo className="text-xs" /> Update your product stock to accept this order
          </p>
        )}
      </div>
    )
  }

  if (order.status === 'processing') {
    return (
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={onMarkPacked}
          disabled={isLoading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-full text-sm transition-colors"
        >
          {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPackage />}
          Mark as Packed
        </button>
        <p className="text-xs text-gray-400">Pack the item before shipping</p>
      </div>
    )
  }

  if (order.status === 'packed') {
    return (
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={onMarkShipped}
          disabled={isLoading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-full text-sm transition-colors"
        >
          {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiTruck />}
          Mark as Shipped
        </button>
        <p className="text-xs text-gray-400">You&apos;ll enter a tracking number</p>
      </div>
    )
  }

  if (order.status === 'shipped') {
    return (
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={onMarkDelivered}
          disabled={isLoading}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-full text-sm transition-colors"
        >
          {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheckCircle />}
          Confirm Delivered
        </button>
        <p className="text-xs text-gray-400">Confirm once customer receives the item</p>
      </div>
    )
  }

  return null
}

// ── Reusable Modal ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
