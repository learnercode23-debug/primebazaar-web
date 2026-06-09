'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Product } from '@/types'

interface CompareContextType {
  items: Product[]
  addToCompare: (p: Product) => void
  removeFromCompare: (id: string) => void
  isInCompare: (id: string) => boolean
  clearCompare: () => void
}

const CompareContext = createContext<CompareContextType>({
  items: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  isInCompare: () => false,
  clearCompare: () => {},
})

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([])

  function addToCompare(p: Product) {
    if (items.length >= 4) return
    if (items.some(i => i._id === p._id)) return
    setItems(prev => [...prev, p])
  }

  function removeFromCompare(id: string) {
    setItems(prev => prev.filter(i => i._id !== id))
  }

  function isInCompare(id: string) {
    return items.some(i => i._id === id)
  }

  function clearCompare() { setItems([]) }

  return (
    <CompareContext.Provider value={{ items, addToCompare, removeFromCompare, isInCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
