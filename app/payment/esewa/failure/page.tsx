'use client'

export const dynamic = 'force-dynamic'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

function EsewaFailureContent() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/payment/failure?reason=esewa_declined')
  }, [router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 font-medium">Processing…</p>
    </div>
  )
}

export default function EsewaFailurePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <EsewaFailureContent />
    </Suspense>
  )
}
