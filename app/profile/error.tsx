'use client'

import Link from 'next/link'

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load your profile</h2>
        <p className="text-gray-500 text-sm mb-6">Please try again or return to the home page.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-full text-sm hover:bg-gray-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
