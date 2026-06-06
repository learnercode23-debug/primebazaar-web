'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6 text-sm">
          An unexpected error occurred. Please try again or go back to the home page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-amazon-orange hover:bg-yellow-400 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-white border border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-full text-sm hover:bg-gray-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
