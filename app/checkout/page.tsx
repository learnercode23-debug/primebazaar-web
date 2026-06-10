// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import { FiCheck, FiTag, FiTruck, FiCreditCard, FiMapPin, FiChevronDown, FiNavigation } from 'react-icons/fi'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type Step = 'guest' | 'address' | 'payment' | 'review'
type PaymentMethod = 'cod'

interface SavedAddress {
  _id: string
  label: string
  isDefault: boolean
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string; color: string; logo: React.ReactNode }[] = [
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay with cash when your order arrives at your door',
    color: 'border-orange-400 bg-orange-50',
    logo: (
      <div className="flex items-center gap-1">
        <span className="text-2xl">💵</span>
        <span className="text-orange-700 font-bold text-sm">COD</span>
      </div>
    ),
  },
]

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, subtotal, clearCart, loading: cartLoading } = useCart()
  const router = useRouter()

  const [step, setStep] = useState<Step>('address')
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [address, setAddress] = useState({
    name: user?.name || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'NP',
    phone: '',
  })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState<{ discount: number; code: string } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [codEligible, setCodEligible] = useState(true)
  const [codFee, setCodFee] = useState(0)
  const [codIneligibleReason, setCodIneligibleReason] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [isGuest, setIsGuest] = useState(false)

  const shippingCost = subtotal > 999 ? 0 : 99
  const discount = couponData?.discount || 0
  const activeCodFee = paymentMethod === 'cod' ? codFee : 0
  const total = subtotal + shippingCost - discount + activeCodFee

  // Check COD eligibility when subtotal or address changes
  useEffect(() => {
    if (subtotal <= 0) return
    const productIds = items.map((i) => (i.product as { _id: string })._id)
    axios.post('/api/cod/check-eligibility', { orderTotal: subtotal, zipCode: address.zipCode, productIds })
      .then((r) => {
        setCodEligible(r.data.eligible)
        setCodFee(r.data.codFee || 0)
        setCodIneligibleReason(r.data.reason || '')
      }).catch(() => {})
  }, [subtotal, address.zipCode])

  useEffect(() => {
    if (authLoading || cartLoading) return
    if (!user && !isGuest) { setStep('guest'); return }
    if (items.length === 0) { router.push('/cart'); return }
    if (!user) return
    axios.get('/api/addresses').then((r) => {
      const addrs = r.data.data || []
      setSavedAddresses(addrs)
      const def = addrs.find((a: SavedAddress) => a.isDefault)
      if (def) {
        setSelectedAddressId(def._id)
        setAddress({ name: def.name, street: def.street, city: def.city, state: def.state, zipCode: def.zipCode, country: def.country, phone: def.phone })
      } else if (addrs.length === 0) {
        setShowNewAddressForm(true)
      }
    })
  }, [user, items.length, router, authLoading, cartLoading])

  async function useCurrentLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a = data.address || {}
          const street = [a.road, a.suburb || a.neighbourhood || a.quarter].filter(Boolean).join(', ')
          const city = a.city || a.town || a.municipality || a.village || a.county || ''
          const state = a.state || a.province || ''
          const zipCode = a.postcode || ''
          const countryMap: Record<string, string> = { np: 'NP', in: 'IN', us: 'US', gb: 'GB', au: 'AU' }
          const country = countryMap[a.country_code?.toLowerCase()] || 'NP'
          setAddress((p) => ({ ...p, street, city, state, zipCode, country }))
          setShowNewAddressForm(true)
          toast.success('Location detected!')
        } catch {
          toast.error('Could not fetch address. Please fill manually.')
        } finally {
          setGpsLoading(false)
        }
      },
      () => { toast.error('Location access denied. Please allow GPS.'); setGpsLoading(false) },
      { timeout: 10000 }
    )
  }

  function selectSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr._id)
    setAddress({ name: addr.name, street: addr.street, city: addr.city, state: addr.state, zipCode: addr.zipCode, country: addr.country, phone: addr.phone })
    setShowNewAddressForm(false)
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    try {
      const res = await axios.post('/api/coupons/validate', { code: couponCode, subtotal })
      setCouponData(res.data.data)
      toast.success(`Coupon applied! You save ${formatPrice(res.data.data.discount)}`)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid coupon')
      setCouponData(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  async function handlePlaceOrder() {
    setPlacing(true)
    const payload = {
      shippingAddress: address,
      couponCode: couponData ? couponCode : undefined,
    }

    try {
      // Cash on Delivery — only payment method
      const res = await axios.post('/api/payment/cod', { ...payload, deliveryOption: 'standard' })
      await clearCart()
      toast.success('Order placed! Pay on delivery.')
      router.push(`/payment/success?orderId=${res.data.data.orderId}&method=cod`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to place order'
      toast.error(msg)
      setPlacing(false)
    }
  }

  const steps: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...((!user) ? [{ key: 'guest' as Step, label: 'Account', icon: FiTag }] : []),
    { key: 'address', label: 'Address', icon: FiMapPin },
    { key: 'payment', label: 'Payment', icon: FiCreditCard },
    { key: 'review', label: 'Review', icon: FiCheck },
  ]
  const stepIdx = steps.findIndex((s) => s.key === step)

  // Show spinner while auth/cart context hydrates — prevents blank-page flash
  if (authLoading || cartLoading) return <LoadingSpinner fullPage />
  if (items.length === 0 && step !== 'guest') return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      {/* Step indicators */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isCompleted = i < stepIdx
          const isCurrent = i === stepIdx
          return (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isCurrent ? 'bg-amazon-dark text-white' : isCompleted ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}>
                {isCompleted ? <FiCheck className="text-xs" /> : <Icon className="text-xs" />}
                {s.label}
              </div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Step 0 — Guest / Account */}
          {step === 'guest' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">How would you like to continue?</h2>
              <p className="text-sm text-gray-500 mb-5">Sign in for a faster checkout experience, or continue as a guest.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Sign in */}
                <button
                  onClick={() => router.push(`/login?redirect=/checkout`)}
                  className="border-2 border-amazon-orange rounded-xl p-5 text-left hover:bg-orange-50 transition-colors"
                >
                  <p className="font-bold text-gray-900 mb-1">Sign in</p>
                  <p className="text-xs text-gray-500">Access saved addresses, track orders, and faster future checkouts.</p>
                  <span className="mt-3 inline-block bg-amazon-yellow text-gray-900 font-bold px-4 py-1.5 rounded-full text-sm">Sign in →</span>
                </button>
                {/* Guest */}
                <div className="border-2 border-gray-200 rounded-xl p-5">
                  <p className="font-bold text-gray-900 mb-1">Continue as guest</p>
                  <p className="text-xs text-gray-500 mb-3">No account needed. Enter your details below.</p>
                  <div className="space-y-2">
                    <input
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="Full name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    />
                    <button
                      onClick={() => { if (guestEmail && guestName) { setIsGuest(true); setAddress(p => ({ ...p, name: guestName })); setStep('address') } }}
                      disabled={!guestEmail || !guestName}
                      className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                    >
                      Continue as Guest →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Address */}
          {step === 'address' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <FiMapPin className="text-amazon-orange" /> Shipping Address
              </h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && !showNewAddressForm && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr._id}
                      onClick={() => selectSavedAddress(addr)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedAddressId === addr._id ? 'border-amazon-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mr-2">{addr.label}</span>
                          <span className="font-medium text-sm text-gray-900">{addr.name}</span>
                          {addr.isDefault && <span className="ml-2 text-xs text-amazon-orange font-medium">Default</span>}
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selectedAddressId === addr._id ? 'border-amazon-orange bg-amazon-orange' : 'border-gray-300'}`}>
                          {selectedAddressId === addr._id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</p>
                    </button>
                  ))}
                  <button onClick={() => setShowNewAddressForm(true)} className="text-amazon-teal text-sm hover:underline">
                    + Use a new address
                  </button>
                </div>
              )}

              {/* New address form */}
              {(showNewAddressForm || savedAddresses.length === 0) && (
                <div className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <button onClick={() => setShowNewAddressForm(false)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                      <FiChevronDown className="rotate-90" /> Use saved address
                    </button>
                  )}

                  {/* GPS auto-fill button */}
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={gpsLoading}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm"
                  >
                    <FiNavigation className={gpsLoading ? 'animate-spin' : ''} />
                    {gpsLoading ? 'Detecting location…' : 'Use Current Location'}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">or fill manually</span></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'name', label: 'Full Name', placeholder: 'Hari Prasad Sharma', full: true },
                      { key: 'street', label: 'Street Address', placeholder: 'Chabahil-4, Kathmandu', full: true },
                      { key: 'city', label: 'City', placeholder: 'Kathmandu' },
                      { key: 'state', label: 'Province', placeholder: 'Bagmati' },
                      { key: 'zipCode', label: 'Postal Code', placeholder: '44600' },
                      { key: 'phone', label: 'Phone', placeholder: '+977-98XXXXXXXX' },
                    ].map(({ key, label, placeholder, full }) => (
                      <div key={key} className={full ? 'sm:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                        <input
                          value={address[key as keyof typeof address]}
                          onChange={(e) => setAddress((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <select
                        value={address.country}
                        onChange={(e) => setAddress((p) => ({ ...p, country: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                      >
                        <option value="NP">🇳🇵 Nepal</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery preferences */}
              <div className="mt-5 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-gray-900">Delivery preferences</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Preferred delivery date (optional)</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    min={new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]}
                    max={new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Delivery instructions (optional)</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {['Leave at door', 'Ring doorbell', 'Call on arrival', 'Leave with security'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setDeliveryInstructions(opt)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${deliveryInstructions === opt ? 'bg-amazon-orange text-white border-amazon-orange' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={deliveryInstructions}
                    onChange={e => setDeliveryInstructions(e.target.value)}
                    placeholder="Any other delivery notes…"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep('payment')}
                disabled={!address.name || !address.street || !address.city || !address.phone}
                className="mt-4 bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm transition-colors"
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 2 — Payment */}
          {step === 'payment' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <FiCreditCard className="text-amazon-orange" /> Choose Payment Method
              </h2>

              {/* Nepal gateway highlight banner */}
              <div className="bg-gradient-to-r from-green-50 to-purple-50 border border-gray-200 rounded-xl p-3 mb-5 flex items-center gap-3">
                <span className="text-2xl">🇳🇵</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Nepal payment gateways supported!</p>
                  <p className="text-xs text-gray-500">Pay with cash when your order arrives</p>
                </div>
              </div>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${paymentMethod === m.id ? m.color : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentMethod === m.id ? 'border-amazon-orange' : 'border-gray-300'}`}>
                          {paymentMethod === m.id && <div className="w-full h-full rounded-full bg-amazon-orange scale-50" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{m.label}</p>
                          <p className="text-xs text-gray-500">{m.description}</p>
                        </div>
                      </div>
                      {m.logo}
                    </div>
                  </button>
                ))}
              </div>


              {/* COD info */}
              {paymentMethod === 'cod' && (
                <div className="mt-4 space-y-2">
                  {!codEligible ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-1">⚠️ COD Not Available</p>
                      <p className="text-xs text-red-600 mt-0.5">{codIneligibleReason}</p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-orange-800 mb-1">💵 Cash on Delivery</p>
                      <div className="text-xs text-orange-700 space-y-0.5">
                        <p>✔ No advance payment required</p>
                        <p>✔ Pay in cash when your order arrives</p>
                        {codFee > 0 && <p>✔ COD handling fee: <strong>+ {formatPrice(codFee)}</strong></p>}
                        <p className="font-bold text-orange-900 mt-1">Amount to pay on delivery: {formatPrice(total)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('address')} className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-full text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep('review')} disabled={paymentMethod === 'cod' && !codEligible} className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm transition-colors">
                  Review Order →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 'review' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Order Review</h2>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {items.map((item) => {
                  const product = item.product as Product
                  const price = product.discountPrice || product.price
                  return (
                    <div key={product._id} className="flex gap-3 items-center">
                      <div className="relative w-12 h-12 rounded bg-gray-50 flex-shrink-0">
                        <Image src={product.images[0] || ''} alt={product.title} fill className="object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.title}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm flex-shrink-0">{formatPrice(price * item.quantity)}</p>
                    </div>
                  )
                })}
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
                <p className="font-medium text-gray-900 mb-0.5 flex items-center gap-1">
                  <FiMapPin className="text-gray-400 text-xs" /> Shipping to:
                </p>
                <p className="text-gray-600">{address.name} · {address.phone}</p>
                <p className="text-gray-600">{address.street}, {address.city}, {address.state} {address.zipCode}</p>
              </div>

              {/* Payment method */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4 flex items-center justify-between">
                <span className="text-gray-600">Payment via</span>
                <div className="flex items-center gap-2 font-semibold">
                  {paymentMethod === 'cod' && <span className="text-orange-700">💵 Cash on Delivery</span>}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('payment')} className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-full text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="flex-1 bg-amazon-orange hover:bg-orange-500 disabled:opacity-70 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order…

                    </>
                  ) : (
                    `Place Order — ${formatPrice(total)}`
                  )}
                </button>
              </div>

              {paymentMethod === 'cod' && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
                  <p className="font-semibold mb-0.5">📦 Cash on Delivery</p>
                  <p>Pay {formatPrice(total)} in cash when your order is delivered.{shippingCost > 0 ? ` Shipping fee of ${formatPrice(shippingCost)} applies.` : ' Free shipping on this order.'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20 space-y-4">
            <h2 className="font-bold text-gray-900">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><FiTruck className="text-xs" /> Shipping</span>
                <span className={subtotal > 999 ? 'text-amazon-green font-medium' : ''}>
                  {subtotal > 999 ? 'FREE' : formatPrice(shippingCost)}
                </span>
              </div>
              {activeCodFee > 0 && (
                <div className="flex justify-between text-orange-600 text-sm">
                  <span>COD Handling Fee</span>
                  <span>+ {formatPrice(activeCodFee)}</span>
                </div>
              )}
              {couponData && (
                <div className="flex justify-between text-amazon-green font-medium">
                  <span>Coupon ({couponData.code})</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
            </div>

            <hr />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {/* Coupon code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <FiTag /> Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE10"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                />
                <button
                  onClick={validateCoupon}
                  disabled={validatingCoupon || !couponCode}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium"
                >
                  {validatingCoupon ? '...' : 'Apply'}
                </button>
              </div>
              {couponData && <p className="text-xs text-amazon-green mt-1">✓ Coupon applied!</p>}
              <p className="text-xs text-gray-400 mt-1">Have a discount code? Enter it above.</p>
            </div>

            {/* Payment badge */}
            <div className="pt-2 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-2">Accepted Payment</p>
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                  💵 Cash on Delivery
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
