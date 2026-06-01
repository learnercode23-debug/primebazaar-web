'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const REASON_MESSAGES: Record<string, string> = {
  missing_data: 'Payment data was missing or incomplete.',
  verification_failed: 'We could not verify your payment with the gateway.',
  session_expired: 'Your payment session expired. Please try again.',
  cart_empty: 'Your cart was empty when we tried to process the order.',
  server_error: 'An unexpected error occurred. Your card was not charged.',
  cancelled: 'Payment was cancelled.',
}

function FailureContent() {
  const params = useSearchParams()
  const reason = params.get('reason') || 'unknown'
  const message = REASON_MESSAGES[reason] || 'Something went wrong with your payment.'

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Failure icon */}
      <div className="mx-auto w-24 h-24 mb-6 flex items-center justify-center bg-red-100 rounded-full">
        <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
      <p className="text-gray-500 mb-2">{message}</p>
      <p className="text-sm text-gray-400 mb-8">
        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{reason}</span>
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-left">
        <h3 className="font-semibold text-yellow-800 mb-2">What to do next:</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Check your wallet/bank balance</li>
          <li>Make sure your payment app is updated</li>
          <li>Try a different payment method</li>
          <li>Contact support if the issue persists</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/checkout"
          className="w-full bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-full transition-colors"
        >
          Try Again
        </Link>
        <Link href="/cart" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-full transition-colors">
          Back to Cart
        </Link>
        <Link href="/" className="text-amazon-teal text-sm hover:underline">
          Go to Homepage
        </Link>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <FailureContent />
    </Suspense>
  )
}
