'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { FiRefreshCw, FiCheck, FiX, FiAlertTriangle, FiCamera, FiLock } from 'react-icons/fi'

/* ── Types ── */
interface CODOrder {
  _id: string
  orderNumber: string
  status: string
  totalAmount: number
  codFee: number
  codCollected: boolean
  deliveryCodeLocked: boolean
  deliveryCodeAttempts: number
  user:            { name: string; phone?: string; email?: string }
  shippingAddress: { name: string; street: string; city: string; phone: string }
  items: Array<{ title: string; quantity: number; price: number }>
}

type Step = 'orders' | 'scan' | 'otp' | 'photo' | 'success'

/* ── Helpers ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    out_for_delivery: 'bg-orange-100 text-orange-700',
    shipped:          'bg-blue-100 text-blue-700',
    delivery_failed:  'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ── Main component ── */
export default function DeliveryAgentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [orders,         setOrders]         = useState<CODOrder[]>([])
  const [loading,        setLoading]        = useState(true)
  const [totalToCollect, setTotalToCollect] = useState(0)
  const [agentName,      setAgentName]      = useState('')

  // Verification flow state
  const [step,        setStep]        = useState<Step>('orders')
  const [activeOrder, setActiveOrder] = useState<CODOrder | null>(null)
  const [scanInput,   setScanInput]   = useState('')
  const [otp,         setOtp]         = useState('')
  const [attemptsLeft,setAttemptsLeft]= useState(5)
  const [submitting,  setSubmitting]  = useState(false)
  const [successData, setSuccessData] = useState<{ orderNumber: string; cashCollected: number } | null>(null)

  const otpRef = useRef<HTMLInputElement>(null)

  // Photo proof state
  const [photoData,      setPhotoData]      = useState<string | null>(null)  // base64
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)  // object URL
  const [gpsCoords,      setGpsCoords]      = useState<{ lat: number; lng: number } | null>(null)
  const [recipientName,  setRecipientName]  = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // ── Real-time GPS broadcast ────────────────────────────────────────────────
  const watchIdRef    = useRef<number | null>(null)
  const lastPushRef   = useRef<number>(0)
  const gpsOrderIdRef = useRef<string | null>(null)
  const [liveOrderId, setLiveOrderId] = useState<string | null>(null)

  function startGPSBroadcast(orderId: string) {
    stopGPSBroadcast()
    gpsOrderIdRef.current = orderId
    if (!navigator.geolocation) {
      toast.error('GPS not available on this device')
      return
    }
    setLiveOrderId(orderId)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastPushRef.current < 4000) return  // throttle to ~once per 4s
        lastPushRef.current = now
        const { latitude: lat, longitude: lng, speed, heading } = pos.coords
        setGpsCoords({ lat, lng })
        axios.post('/api/delivery/location', {
          orderId: gpsOrderIdRef.current,
          lat, lng,
          speed: speed ?? null,
          heading: heading ?? null,
        }).catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    )
  }

  function stopGPSBroadcast() {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    gpsOrderIdRef.current = null
    setLiveOrderId(null)
  }

  // Agent begins the delivery ride: marks the order out_for_delivery and goes live
  async function startRoute(order: CODOrder) {
    try {
      await axios.put('/api/delivery/orders', { orderId: order._id, action: 'start_route' })
      startGPSBroadcast(order._id)
      toast.success('🛵 Route started — customer can now track you live')
      fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Could not start route')
    }
  }

  useEffect(() => () => stopGPSBroadcast(), [])

  // Auth guard — delivery agents and admins only
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login?redirect=/delivery'); return }
    if (user.role !== 'delivery' && user.role !== 'admin') router.push('/')
  }, [user, authLoading, router])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/delivery/orders')
      setOrders(res.data.data || [])
      setTotalToCollect(res.data.totalToCollect || 0)
      setAgentName(res.data.agentName || 'Agent')
    } catch { toast.error('Failed to load orders') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!user) return  // wait for auth before fetching
    fetchOrders()
    const t = setInterval(fetchOrders, 30000)  // refresh every 30s
    return () => clearInterval(t)
  }, [fetchOrders])

  /* ── Open verification flow ── */
  function startVerify(order: CODOrder) {
    setActiveOrder(order)
    setScanInput(order._id)
    // Start broadcasting GPS so customer can see real-time location
    startGPSBroadcast(order._id)
    setOtp('')
    setAttemptsLeft(5)
    setStep('scan')
  }

  /* ── Step 1: QR / Order ID scan ── */
  async function handleScan() {
    if (!activeOrder || !scanInput.trim()) return
    setSubmitting(true)
    try {
      await axios.post(`/api/orders/${activeOrder._id}/scan`, { scannedOrderId: scanInput.trim() })
      toast.success('✓ Order confirmed — enter OTP now')
      setStep('otp')
      setTimeout(() => otpRef.current?.focus(), 100)
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Scan failed')
    } finally { setSubmitting(false) }
  }

  /* ── Step 2: OTP + complete delivery ── */
  async function handleVerifyDelivery() {
    if (!activeOrder || otp.length < 4) return
    setSubmitting(true)
    try {
      const res = await axios.post(`/api/orders/${activeOrder._id}/verify-delivery`, {
        scannedOrderId: scanInput.trim(),
        otp:            otp.trim(),
      })
      setSuccessData({
        orderNumber:  activeOrder.orderNumber,
        cashCollected: res.data.order?.cashCollected || activeOrder.totalAmount,
      })
      // Delivery done — stop sharing live location for this order
      stopGPSBroadcast()
      // Get GPS before showing photo step
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => setGpsCoords(null),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }
      setStep('photo')
      fetchOrders()
    } catch (e: unknown) {
      const data = (e as {response?:{data?:{error?:string;attemptsLeft?:number;locked?:boolean}}})?.response?.data
      if (data?.locked) {
        toast.error('🔒 Code locked — contact admin to unlock')
        fetchOrders()
        resetFlow()
      } else if (data?.attemptsLeft != null) {
        // Wrong OTP — decrement counter
        setAttemptsLeft(data.attemptsLeft)
        toast.error(data?.error || 'Wrong OTP')
        setOtp('')
        otpRef.current?.focus()
      } else {
        // Other error (no code set, wrong status, etc.) — don't touch attempts
        toast.error(data?.error || 'Verification failed')
        setOtp('')
      }
    } finally { setSubmitting(false) }
  }

  function resetFlow() {
    setStep('orders')
    setActiveOrder(null)
    setScanInput('')
    setOtp('')
    setSuccessData(null)
    setPhotoData(null)
    setPhotoPreview(null)
    setGpsCoords(null)
    setRecipientName('')
  }

  // Handle photo selected from camera
  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please capture an image'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Photo too large (max 10MB)'); return }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setPhotoData(base64)
      setPhotoPreview(URL.createObjectURL(file))
    }
    reader.readAsDataURL(file)
  }

  // Upload proof photo after capture
  async function uploadProof() {
    if (!activeOrder || !photoData) return
    setUploadingPhoto(true)
    try {
      await axios.post(`/api/orders/${activeOrder._id}/delivery-proof`, {
        photoBase64:   photoData,
        latitude:      gpsCoords?.lat,
        longitude:     gpsCoords?.lng,
        recipientName: recipientName.trim() || undefined,
        otpVerified:   true,
      })
      toast.success('✓ Proof uploaded successfully!')
      setStep('success')
    } catch (e: unknown) {
      const msg = (e as {response?:{data?:{error?:string}}})?.response?.data?.error
      if (msg?.includes('already uploaded')) {
        toast.success('Proof already uploaded for this order')
        setStep('success')
      } else {
        toast.error(msg || 'Failed to upload proof')
      }
    } finally { setUploadingPhoto(false) }
  }

  async function markFailed(order: CODOrder, action: 'failed' | 'refused') {
    const reason = prompt(`Reason for ${action}:`) || ''
    try {
      await axios.put('/api/delivery/orders', { orderId: order._id, action, failureReason: reason })
      if (liveOrderId === order._id) stopGPSBroadcast()
      toast.success(`Marked as ${action}`)
      fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Action failed')
    }
  }

  // Show nothing while auth loads or redirecting
  if (authLoading || !user || (user.role !== 'delivery' && user.role !== 'admin')) return null

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-white">Delivery Agent</h1>
          <p className="text-xs text-gray-400">{agentName} · {orders.length} pending</p>
        </div>
        <div className="flex items-center gap-2">
          {liveOrderId && (
            <span className="flex items-center gap-1.5 bg-green-900 border border-green-700 text-green-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/> LIVE
            </span>
          )}
          {totalToCollect > 0 && (
            <div className="bg-green-900 border border-green-700 rounded-xl px-3 py-1 text-center">
              <p className="text-[10px] text-green-400">To Collect</p>
              <p className="text-sm font-bold text-green-300">Rs.{totalToCollect.toLocaleString()}</p>
            </div>
          )}
          <button onClick={fetchOrders} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            <FiRefreshCw className="text-gray-300 text-sm"/>
          </button>
        </div>
      </div>

      {/* ══ ORDERS LIST ══ */}
      {step === 'orders' && (
        <div className="p-4 space-y-3 max-w-lg mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FiCheck className="text-5xl mx-auto mb-3 text-green-500"/>
              <p className="text-lg font-medium text-gray-300">All done!</p>
              <p className="text-sm mt-1">No pending COD orders assigned to you.</p>
              <p className="text-xs text-gray-600 mt-2">Orders appear here once an admin assigns them to you</p>
              <button onClick={fetchOrders} className="mt-4 text-sm text-orange-400 underline">Refresh</button>
            </div>
          ) : orders.map(order => (
            <div key={order._id} className={`bg-gray-800 rounded-2xl p-4 border ${order.deliveryCodeLocked ? 'border-red-700' : 'border-gray-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-orange-400">#{order.orderNumber}</p>
                  <StatusBadge status={order.status}/>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">Rs.{((order.totalAmount || 0)).toLocaleString()}</p>
                  {(order.codFee || 0) > 0 && <p className="text-xs text-gray-400">incl. Rs.{order.codFee} COD fee</p>}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-xl p-3 mb-3">
                <p className="font-medium text-sm">{order.shippingAddress?.name || order.user?.name}</p>
                <p className="text-xs text-gray-400">{order.shippingAddress?.street}, {order.shippingAddress?.city}</p>
                {order.shippingAddress?.phone && (
                  <a href={`tel:${order.shippingAddress.phone}`} className="text-xs text-blue-400">📞 {order.shippingAddress.phone}</a>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-3">
                {(order.items || []).slice(0, 2).map((item, i) => `${item.quantity}× ${item.title}`).join(', ')}
                {(order.items || []).length > 2 && ` +${order.items.length - 2} more`}
              </p>

              {order.deliveryCodeLocked && (
                <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 rounded-xl px-3 py-2 mb-3 text-xs text-red-300">
                  <FiLock/> Locked after wrong attempts. Contact admin.
                </div>
              )}

              {!order.codCollected ? (
                <div className="space-y-2">
                  {/* Live GPS sharing — customer sees this on their tracking map */}
                  {liveOrderId === order._id ? (
                    <div className="flex items-center justify-between bg-green-900/40 border border-green-700 rounded-xl px-3 py-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/> LIVE — customer sees your location
                      </span>
                      <button onClick={stopGPSBroadcast} className="text-xs text-gray-400 underline hover:text-gray-200">Stop</button>
                    </div>
                  ) : order.status !== 'delivery_failed' && (
                    <button
                      onClick={() => startRoute(order)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
                    >
                      🛵 {order.status === 'shipped' ? 'Start Route — share live GPS' : 'Share Live Location'}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startVerify(order)}
                      disabled={order.deliveryCodeLocked}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
                    >
                      <FiCamera className="text-base"/> Verify &amp; Collect Cash
                    </button>
                    <button onClick={() => markFailed(order, 'failed')}
                      className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl" title="Mark failed">
                      <FiX/>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 rounded-xl px-3 py-2 text-sm text-green-400">
                  <FiCheck/> Collected · Rs.{((order.totalAmount || 0)).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ STEP 1: QR SCAN ══ */}
      {step === 'scan' && activeOrder && (
        <div className="p-4 max-w-sm mx-auto pt-6">
          <button onClick={resetFlow} className="text-gray-400 text-sm mb-4 flex items-center gap-1">← Back to orders</button>
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-orange-400 mb-0.5">STEP 1 OF 3</p>
              <p className="text-sm font-semibold text-white">Scan Order QR Code</p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Check the Order ID below matches the package label, then tap Confirm.
            </p>
            <div className="bg-gray-700 rounded-xl p-3 mb-4 text-sm">
              <p className="font-semibold text-white">#{activeOrder.orderNumber}</p>
              <p className="text-gray-400">{activeOrder.shippingAddress?.name}</p>
              <p className="font-bold text-green-400">Rs.{((activeOrder.totalAmount||0)).toLocaleString()}</p>
            </div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Order ID from QR</label>
            <input
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-xs font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleScan}
              disabled={!scanInput.trim() || submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm"
            >
              {submitting ? 'Verifying…' : '✓ Confirm Order →'}
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 2: OTP ENTRY ══ */}
      {step === 'otp' && activeOrder && (
        <div className="p-4 max-w-sm mx-auto pt-6">
          <button onClick={() => setStep('scan')} className="text-gray-400 text-sm mb-4 flex items-center gap-1">← Back</button>
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-green-400 mb-0.5">STEP 2 OF 3</p>
              <p className="text-sm font-semibold text-white">Ask Customer for Code</p>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Ask the customer to show their delivery code from the order page and enter it below.
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">5-Digit Delivery Code</label>
            <input
              ref={otpRef}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
              onKeyDown={e => { if (e.key==='Enter' && otp.length >= 4) handleVerifyDelivery() }}
              type="tel" inputMode="numeric" pattern="[0-9]*"
              placeholder="_ _ _ _ _"
              maxLength={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-2xl px-4 py-5 text-white text-4xl font-black tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            />
            {attemptsLeft < 5 && (
              <p className="text-xs text-red-400 text-center mb-4 flex items-center justify-center gap-1">
                <FiAlertTriangle/> {attemptsLeft} attempt{attemptsLeft===1?'':'s'} left before lock
              </p>
            )}
            <div className="bg-gray-700 rounded-xl p-3 text-xs text-gray-400 mb-4">
              <p>#{activeOrder.orderNumber} · Rs.{((activeOrder.totalAmount||0)).toLocaleString()}</p>
            </div>
            <button
              onClick={handleVerifyDelivery}
              disabled={otp.length < 4 || submitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <FiCheck className="text-lg"/>
              {submitting ? 'Verifying…' : 'Verify Code & Collect Cash'}
            </button>
          </div>
        </div>
      )}

      {/* ══ STEP 3: PHOTO PROOF ══ */}
      {step === 'photo' && activeOrder && (
        <div className="p-4 max-w-sm mx-auto pt-6">
          <button onClick={() => setStep('otp')} className="text-gray-400 text-sm mb-4 flex items-center gap-1">← Back</button>
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-green-400 mb-0.5">STEP 3 OF 3</p>
              <p className="text-sm font-semibold text-white">Take Proof Photo</p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Capture a photo of the delivered package or customer receiving it. This photo is sent to the seller for confirmation.
            </p>

            {/* GPS status */}
            <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 mb-4 ${gpsCoords ? 'bg-green-900/40 border border-green-700 text-green-400' : 'bg-yellow-900/40 border border-yellow-700 text-yellow-400'}`}>
              📍 {gpsCoords ? `GPS captured (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)})` : 'GPS not available — photo will be flagged'}
            </div>

            {/* Camera input — label triggers it directly (works on all browsers) */}
            <input
              id="pod-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />

            {/* Photo preview or capture button */}
            {photoPreview ? (
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Proof preview" className="w-full rounded-xl border border-gray-600 object-cover max-h-56"/>
                <label htmlFor="pod-camera-input"
                  className="block w-full mt-2 text-center text-xs text-gray-400 underline cursor-pointer"
                  onClick={() => setPhotoData(null)}>
                  📷 Retake photo
                </label>
              </div>
            ) : (
              <label htmlFor="pod-camera-input"
                className="w-full bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 rounded-xl py-10 flex flex-col items-center gap-2 mb-4 cursor-pointer block">
                <FiCamera className="text-4xl text-green-400"/>
                <p className="text-base text-white font-bold">📸 Take Delivery Photo</p>
                <p className="text-xs text-gray-400">Tap here to open camera</p>
                <p className="text-xs text-gray-500">(rear camera on mobile)</p>
              </label>
            )}

            {/* Recipient name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1">Recipient Name (optional)</label>
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                placeholder="Name of person who received"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>

            <button onClick={uploadProof} disabled={!photoData || uploadingPhoto}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-2">
              <FiCamera className="text-base"/>
              {uploadingPhoto ? 'Uploading proof...' : 'Submit Photo & Complete'}
            </button>
            {!photoData && (
              <button onClick={() => setStep('success')}
                className="w-full text-gray-400 text-xs underline py-2 hover:text-gray-200">
                Skip photo (complete without proof)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ SUCCESS ══ */}
      {step === 'success' && successData && (
        <div className="p-4 max-w-sm mx-auto pt-10">
          <div className="bg-gray-800 rounded-2xl p-6 border border-green-700 text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900">
              <FiCheck className="text-4xl text-white"/>
            </div>
            <h2 className="text-2xl font-black mb-1">Delivered!</h2>
            <p className="text-gray-400 text-sm mb-5">Code verified &amp; cash collected</p>
            <div className="bg-gray-700 rounded-xl p-4 mb-5 text-left space-y-2">
              <div>
                <p className="text-xs text-gray-400">Order</p>
                <p className="font-bold">#{successData.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cash Collected</p>
                <p className="text-2xl font-black text-green-400">Rs.{successData.cashCollected.toLocaleString()}</p>
              </div>
            </div>
            <button onClick={resetFlow} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl">
              Back to Orders
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
