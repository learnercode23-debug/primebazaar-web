'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      router.push('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(email: string, password: string) {
    setForm({ email, password })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <Link href="/" className="mb-6 flex items-center gap-1">
        <span className="text-3xl font-bold text-gray-900">primebazaar</span>
        <span className="text-amazon-yellow text-4xl font-black">.</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold py-2.5 rounded-full transition-colors text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>

        <hr className="my-4" />

        <div className="text-center">
          <span className="text-sm text-gray-600">New to Primebazaar?</span>{' '}
          <Link href="/register" className="text-sm text-amazon-teal hover:underline font-medium">
            Create an account
          </Link>
        </div>

        {/* Quick login for demo */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">Quick Demo Login:</p>
          <div className="space-y-1">
            {[
              ['Customer', 'alice@customer.com', 'customer123'],
              ['Seller', 'tech@seller.com', 'seller123'],
              ['Admin', 'admin@primebazaar.com', 'admin123'],
            ].map(([role, email, pass]) => (
              <button
                key={role}
                onClick={() => quickLogin(email, pass)}
                className="w-full text-left text-xs text-blue-700 hover:underline"
              >
                {role}: {email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
