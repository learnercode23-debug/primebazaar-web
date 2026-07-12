'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'
import ProductCard from '@/components/product/ProductCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiHeart } from 'react-icons/fi'

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading } = useWishlist()

  if (authLoading) return <LoadingSpinner fullPage />

  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <FiHeart className="text-6xl text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Sign in to view your wishlist</p>
        <Link href="/login" className="bg-amazon-yellow text-gray-900 font-bold px-6 py-2.5 rounded-full">Sign In</Link>
      </div>
    </div>
  )

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FiHeart className="text-red-500" /> Your Wishlist ({items.length})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart className="text-6xl text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">Save items you love by clicking the heart icon on any product.</p>
          <Link href="/products" className="bg-amazon-yellow text-gray-900 font-bold px-6 py-2.5 rounded-full">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
