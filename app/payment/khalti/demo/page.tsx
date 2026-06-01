'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

function KhaltiDemoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const amount = parseFloat(params.get('amount') || '0')
  const orderId = params.get('orderId') || ''
  const [processing, setProcessing] = useState(false)
  const [mpin, setMpin] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'pay' | 'otp'>('pay')

  function handlePay() {
    if (mpin !== '1111') { alert('Incorrect MPIN. Use test MPIN: 1111'); return }
    setStep('otp')
  }

  function handleOtp() {
    if (otp !== '987654') { alert('Incorrect OTP. Use test OTP: 987654'); return }
    setProcessing(true)
    setTimeout(() => {
      router.replace(`/api/payment/khalti/verify?pidx=DEMO-${orderId}&status=Completed`)
    }, 1200)
  }

  function handleCancel() {
    router.replace('/payment/failure?reason=cancelled')
  }

  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Khalti header */}
        <div className="bg-purple-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-black text-sm">K</span>
            </div>
            <span className="font-bold text-lg">Khalti</span>
            <span className="ml-auto text-xs bg-purple-500 px-2 py-0.5 rounded-full">Demo Mode</span>
          </div>
          <p className="text-purple-200 text-xs mt-1">Secure Digital Payment Gateway</p>
        </div>

        <div className="px-6 py-5">
          {/* Merchant + amount */}
          <div className="text-center mb-5">
            <p className="text-sm text-gray-500">Pay to</p>
            <p className="font-bold text-gray-900 text-base">Primebazaar Store</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">Rs. {formatPrice(amount).replace('$', '')}</p>
          </div>

          {step === 'pay' ? (
            <>
              <div className="bg-purple-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-xs text-purple-600 mb-1">
                  <span>Khalti ID</span>
                  <span className="font-mono">98XXXXXXXX</span>
                </div>
                <div className="flex justify-between text-xs text-purple-600">
                  <span>Balance</span>
                  <span className="font-semibold">Rs. 50,000 (test)</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">MPIN</label>
                <input
                  type="password"
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value)}
                  placeholder="Enter MPIN (test: 1111)"
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 text-center mt-1">Test MPIN: <span className="font-mono font-bold">1111</span></p>
              </div>

              <button
                onClick={handlePay}
                disabled={!mpin}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Pay Rs. {formatPrice(amount).replace('$', '')}
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">📱</span>
                </div>
                <p className="text-sm text-gray-600">OTP sent to 98XXXXXXXX</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP (test: 987654)"
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 text-center mt-1">Test OTP: <span className="font-mono font-bold">987654</span></p>
              </div>

              {processing ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-purple-700">Processing payment…</span>
                </div>
              ) : (
                <button
                  onClick={handleOtp}
                  disabled={otp.length < 4}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Confirm Payment
                </button>
              )}
            </>
          )}

          <button onClick={handleCancel} className="w-full text-center text-sm text-gray-400 hover:text-red-500 mt-3 transition-colors">
            Cancel Payment
          </button>
        </div>

        <div className="px-6 pb-4 flex items-center justify-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full" />
          <span className="text-xs text-gray-400">Secured by Khalti — Demo Mode</span>
        </div>
      </div>
    </div>
  )
}

export default function KhaltiDemoPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <KhaltiDemoContent />
    </Suspense>
  )
}
