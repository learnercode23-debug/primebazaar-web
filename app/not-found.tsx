import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          We&apos;re sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="bg-amazon-yellow hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-full transition-colors">
            Go Home
          </Link>
          <Link href="/products" className="border border-brand-200 text-brand-600 hover:bg-brand-50 font-medium px-6 py-3 rounded-full transition-colors">
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}
