'use client'

export const dynamic = 'force-dynamic'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// eSewa redirects to /payment/esewa/success?data=<base64>
// We relay to our verify API route which processes the order then redirects to /payment/success
function EsewaSuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const data = params.get('data')

  useEffect(() => {
    if (data) {
      router.replace(`/api/payment/esewa/verify?data=${encodeURIComponent(data)}`)
    } else {
      router.replace('/payment/failure?reason=missing_data')
    }
  }, [data, router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 font-medium">Verifying your eSewa payment…</p>
      <p className="text-sm text-gray-400">Please don&apos;t close this tab</p>
    </div>
  )
}

export default function EsewaSuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <EsewaSuccessContent />
    </Suspense>
  )
}
