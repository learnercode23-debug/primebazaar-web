'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import axios from 'axios'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiArrowLeft, FiMapPin, FiCheck, FiPackage, FiXCircle, FiClock } from 'react-icons/fi'

interface StatusEvent { status: string; timestamp: string; note?: string }
interface OrderItem { title: string; quantity: number; image?: string }
interface TrackedOrder {
  _id: string
  orderNumber?: string
  status: string
  createdAt: string
  acceptedAt?: string
  packedAt?: string
  shippedAt?: string
  deliveredAt?: string
  estimatedDelivery?: string
  trackingNumber?: string
  statusHistory?: StatusEvent[]
  shippingAddress?: { name?: string; street?: string; city?: string; state?: string; phone?: string }
  items?: OrderItem[]
}

const FLOW = [
  { key: 'confirmed',        label: 'Order Confirmed', icon: '✅', desc: 'Your order has been placed' },
  { key: 'packed',           label: 'Packed',          icon: '📦', desc: 'Securely packed at the warehouse' },
  { key: 'shipped',          label: 'Shipped',         icon: '🚚', desc: 'Handed to the courier' },
  { key: 'out_for_delivery', label: 'Out for Delivery',icon: '🛵', desc: 'On the way to you' },
  { key: 'delivered',        label: 'Delivered',       icon: '🏠', desc: 'Package delivered' },
]
// How far each order status sits along the flow above.
const RANK: Record<string, number> = {
  pending: 0, confirmed: 0, processing: 0,
  packed: 1, shipped: 2, out_for_delivery: 3, delivered: 4,
}
const NEGATIVE = ['cancelled', 'refused', 'delivery_failed', 'returned']

function fmt(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface DriverLoc { lat: number; lng: number; speed: number | null; heading: number | null; at: string }

// Real map showing the courier's actual GPS position (OpenStreetMap, no API key needed).
function LiveGpsMap({ loc }: { loc: DriverLoc }) {
  const d = 0.006 // ~600m window around the courier
  const bbox = `${loc.lng - d},${loc.lat - d},${loc.lng + d},${loc.lat + d}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${loc.lat},${loc.lng}`
  const ago = Math.max(0, Math.round((Date.now() - new Date(loc.at).getTime()) / 1000))
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100">
      <iframe title="Live delivery location" src={src} className="w-full block" style={{ height: 220, border: 0 }} loading="lazy" />
      <div className="flex items-center justify-between px-3 py-2 bg-white text-xs">
        <span className="flex items-center gap-1.5 text-green-600 font-bold"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live GPS</span>
        <span className="text-gray-400">
          {loc.speed != null ? `${Math.round(loc.speed)} km/h · ` : ''}updated {ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`} ago
        </span>
      </div>
    </div>
  )
}

function DeliveryMap({ progress }: { progress: number }) {
  const truckX = 40 + (progress / 100) * 220
  const truckY = 90 - Math.sin((progress / 100) * Math.PI) * 30
  return (
    <div className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50 rounded-2xl overflow-hidden border border-gray-100" style={{ height: 200 }}>
      <svg viewBox="0 0 300 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {[40, 80, 120, 160, 200, 240].map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#e5e7eb" strokeWidth="0.5" />)}
        {[[20,100,30,60],[60,90,25,70],[100,110,20,50],[180,95,28,65],[220,105,22,55],[260,88,30,72]].map(([x,y,w,h],i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={i % 2 === 0 ? '#ddd6fe' : '#bfdbfe'} opacity="0.6" />
        ))}
        <path d="M 40 130 Q 80 120 110 100 Q 150 75 190 90 Q 220 100 260 80" fill="none" stroke="#e5e7eb" strokeWidth="6" strokeLinecap="round" />
        <path d="M 40 130 Q 80 120 110 100 Q 150 75 190 90 Q 220 100 260 80" fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" clipPath="url(#progressClip)" />
        <defs><clipPath id="progressClip"><rect x="0" y="0" width={40 + (progress / 100) * 220} height="180" /></clipPath></defs>
        <circle cx="40" cy="130" r="8" fill="#7c3aed" /><text x="40" y="148" textAnchor="middle" fill="#6b7280" fontSize="7">Warehouse</text>
        <circle cx="260" cy="80" r="10" fill="#ef4444" /><text x="260" y="97" textAnchor="middle" fill="#6b7280" fontSize="7">Your home</text>
        <g transform={`translate(${truckX - 12}, ${truckY - 12})`}><circle cx="12" cy="12" r="14" fill="#7c3aed" /><text x="12" y="16" textAnchor="middle" fontSize="14">🛵</text></g>
      </svg>
    </div>
  )
}

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [driverLoc, setDriverLoc] = useState<DriverLoc | null>(null)

  useEffect(() => {
    if (!orderId) return
    axios.get(`/api/orders/${orderId}`)
      .then(r => setOrder(r.data.data))
      .catch(err => setError(err?.response?.status === 404 ? 'Order not found' : 'Unable to load this order'))
      .finally(() => setLoading(false))
  }, [orderId])

  // Poll the courier's real GPS location while the order is in transit
  useEffect(() => {
    if (!orderId || !order) return
    if (!['shipped', 'out_for_delivery'].includes(order.status)) return
    let active = true
    const poll = () => axios.get(`/api/delivery/location?orderId=${orderId}`)
      .then(r => { if (active) setDriverLoc(r.data?.data?.driverLocation || null) })
      .catch(() => {})
    poll()
    const id = setInterval(poll, 10000)
    return () => { active = false; clearInterval(id) }
  }, [orderId, order])

  if (loading) return <LoadingSpinner fullPage />

  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <FiPackage className="text-5xl mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-700">{error || 'Order not found'}</p>
        <Link href="/orders" className="inline-block mt-4 text-violet-600 hover:underline text-sm">Back to Orders</Link>
      </div>
    )
  }

  const ordNum = order.orderNumber || `#${order._id.slice(-8).toUpperCase()}`
  const isNegative = NEGATIVE.includes(order.status)
  const isDelivered = order.status === 'delivered'
  const currentStep = RANK[order.status] ?? 0
  const progress = isDelivered ? 100 : Math.round((currentStep / (FLOW.length - 1)) * 100)

  // Real timestamp for each flow step (prefer statusHistory, fall back to dedicated fields)
  function stepTime(key: string): string | undefined {
    const fromHistory = order!.statusHistory?.find(h =>
      h.status === key || (key === 'confirmed' && ['pending', 'confirmed', 'processing'].includes(h.status))
    )?.timestamp
    if (fromHistory) return fromHistory
    const map: Record<string, string | undefined> = {
      confirmed: order!.acceptedAt || order!.createdAt,
      packed: order!.packedAt,
      shipped: order!.shippedAt,
      delivered: order!.deliveredAt,
    }
    return map[key]
  }

  // ETA / status banner text — honest, based on real fields (no fake "10 min")
  let etaTitle = ''
  let etaSub = ''
  if (isDelivered) {
    etaTitle = 'Delivered'
    etaSub = order.deliveredAt ? `Delivered on ${fmt(order.deliveredAt)}` : 'Your package has arrived'
  } else if (isNegative) {
    etaTitle = order.status === 'cancelled' ? 'Order Cancelled' : order.status === 'returned' ? 'Returned' : order.status === 'refused' ? 'Delivery Refused' : 'Delivery Failed'
    etaSub = 'This order is no longer in transit'
  } else {
    const est = order.estimatedDelivery
    etaTitle = est ? `Arriving ${fmtDate(est)}` : 'In Progress'
    etaSub = FLOW[currentStep]?.desc || 'Your order is being processed'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href="/orders" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Order Tracking</h1>
          <p className="text-sm text-gray-500">Order {ordNum}</p>
        </div>
        {order.status === 'out_for_delivery' ? (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
          </div>
        ) : (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${isDelivered ? 'bg-green-100 text-green-700' : isNegative ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 mb-4 flex items-center justify-between text-white ${isNegative ? 'bg-gradient-to-r from-rose-500 to-red-600' : isDelivered ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`}>
        <div>
          <p className="text-white/70 text-xs">{isDelivered ? 'Status' : isNegative ? 'Status' : 'Estimated arrival'}</p>
          <p className="text-2xl font-black">{etaTitle}</p>
          <p className="text-white/80 text-xs mt-0.5">{etaSub}</p>
        </div>
        <div className="text-5xl opacity-80">{isNegative ? '⚠️' : isDelivered ? '✅' : '🛵'}</div>
      </div>

      {/* Map + progress — only while in transit */}
      {!isNegative && (
        <>
          <div className="mb-4">
            {driverLoc ? <LiveGpsMap loc={driverLoc} /> : <DeliveryMap progress={progress} />}
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Warehouse</span>
              <span className="font-semibold text-violet-700">{progress}% complete</span>
              <span>Your home</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {!driverLoc && order.status === 'out_for_delivery' && (
              <p className="text-[11px] text-gray-400 mt-1.5 text-center">Live GPS appears here once your courier shares their location.</p>
            )}
          </div>
        </>
      )}

      {/* Steps with real timestamps */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="font-black text-gray-900 text-sm mb-3">Delivery Status</h2>
        {isNegative ? (
          <div className="flex items-center gap-3 text-red-600">
            <FiXCircle className="text-xl" />
            <p className="text-sm font-semibold capitalize">{order.status.replace(/_/g, ' ')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {FLOW.map((step, i) => {
              const done = i < currentStep || (isDelivered && i <= currentStep)
              const active = i === currentStep && !isDelivered
              const ts = stepTime(step.key)
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-all
                    ${done ? 'bg-violet-600 text-white' : active ? 'bg-violet-50 border-2 border-violet-600' : 'bg-gray-100'}`}>
                    {done ? <FiCheck className="text-sm" /> : <span>{step.icon}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    {active && <p className="text-xs text-violet-600 font-medium">{step.desc}</p>}
                    {ts && (done || active) && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><FiClock className="text-[10px]" /> {fmt(ts)}</p>}
                  </div>
                  {active && <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Now</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
          <h2 className="font-black text-gray-900 text-sm mb-3">Items</h2>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                {it.image && <img src={it.image} alt="" className="w-9 h-9 rounded-lg object-cover border" />}
                <p className="text-sm text-gray-700 flex-1 line-clamp-1">{it.title}</p>
                <span className="text-xs text-gray-400">×{it.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery address + tracking number */}
      <div className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3">
        <FiMapPin className="text-violet-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Delivering to</p>
          {order.shippingAddress ? (
            <>
              <p className="text-sm text-gray-600 mt-0.5">{order.shippingAddress.name}</p>
              <p className="text-xs text-gray-500">{[order.shippingAddress.street, order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}</p>
              {order.shippingAddress.phone && <p className="text-xs text-gray-400 mt-0.5">{order.shippingAddress.phone}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-0.5">Your saved delivery address</p>
          )}
          {order.trackingNumber && <p className="text-xs text-gray-400 mt-1">Tracking #: <span className="font-mono">{order.trackingNumber}</span></p>}
        </div>
      </div>
    </div>
  )
}
