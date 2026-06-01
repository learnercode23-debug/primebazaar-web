'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role?: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const res = await axios.get('/api/auth/me')
      setUser(res.data.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await axios.post('/api/auth/login', { email, password })
    setUser(res.data.data)
  }

  async function register(name: string, email: string, password: string, role = 'customer') {
    const res = await axios.post('/api/auth/register', { name, email, password, role })
    setUser(res.data.data)
  }

  async function logout() {
    await axios.delete('/api/auth/me')
    setUser(null)
  }

  function updateUser(data: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...data } : null))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
