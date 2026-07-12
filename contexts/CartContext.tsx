'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { CartItem, Product } from '@/types'
import { useAuth } from './AuthContext'

interface CartContextType {
  items: CartItem[]
  loading: boolean
  itemCount: number
  subtotal: number
  addToCart: (productId: string, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  isInCart: (productId: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return }
    try {
      setLoading(true)
      const res = await axios.get('/api/cart')
      setItems(res.data.data?.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  async function addToCart(productId: string, quantity = 1) {
    // Stable toast ids so rapid clicks replace the toast instead of stacking many.
    if (!user) { toast.error('Please login to add items to cart', { id: 'cart-login' }); return }
    try {
      const res = await axios.post('/api/cart', { productId, quantity })
      setItems(res.data.data?.items || [])
      toast.success('Added to cart!', { id: 'cart-add' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add to cart'
      toast.error(msg, { id: 'cart-error' })
    }
  }

  async function removeFromCart(productId: string) {
    try {
      const res = await axios.delete('/api/cart', { data: { productId } })
      setItems(res.data.data?.items || [])
      toast.success('Removed from cart')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  async function updateQuantity(productId: string, quantity: number) {
    try {
      const res = await axios.put('/api/cart', { productId, quantity })
      setItems(res.data.data?.items || [])
    } catch {
      toast.error('Failed to update quantity')
    }
  }

  async function clearCart() {
    try {
      await axios.delete('/api/cart', { data: {} })
      setItems([])
    } catch {
      toast.error('Failed to clear cart')
    }
  }

  function isInCart(productId: string): boolean {
    return items.some((item) => {
      const product = item.product as Product
      return product._id === productId
    })
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => {
    const product = item.product as Product
    const price = product.discountPrice || product.price
    return sum + price * item.quantity
  }, 0)

  return (
    <CartContext.Provider value={{ items, loading, itemCount, subtotal, addToCart, removeFromCart, updateQuantity, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
