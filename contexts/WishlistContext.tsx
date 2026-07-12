'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Product } from '@/types'
import { useAuth } from './AuthContext'

interface WishlistContextType {
  items: Product[]
  loading: boolean
  toggleWishlist: (productId: string) => Promise<void>
  isWishlisted: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWishlist = useCallback(async () => {
    if (!user) { setItems([]); return }
    try {
      setLoading(true)
      const res = await axios.get('/api/wishlist')
      setItems(res.data.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  async function toggleWishlist(productId: string) {
    // Stable toast ids so rapid/repeat clicks replace the toast instead of stacking dozens.
    if (!user) { toast.error('Please login to save items', { id: 'wishlist-login' }); return }
    const wasWishlisted = isWishlisted(productId)
    try {
      const res = await axios.post('/api/wishlist', { productId })
      // Re-fetch to get full product data
      await fetchWishlist()
      toast.success(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist', { id: 'wishlist-toggle' })
      return res.data
    } catch {
      toast.error('Failed to update wishlist', { id: 'wishlist-error' })
    }
  }

  function isWishlisted(productId: string): boolean {
    return items.some((item) => item._id === productId)
  }

  return (
    <WishlistContext.Provider value={{ items, loading, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
