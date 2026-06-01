'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

function RegisterForm() {
  const { register } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const defaultRole = params.get('role') || 'customer'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.role)
      toast.success('Account created! Welcome to Primebazaar.')
      router.push(form.role === 'seller' ? '/seller' : '/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <Link href="/" className="mb-6 flex items-center gap-1">
        <span className="text-3xl font-bold text-gray-900">primebazaar</span>
        <span className="text-amazon-yellow text-4xl font-black">.</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create Account</h1>

        {/* Role tabs */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          {['customer', 'seller'].map((r) => (
            <button
              key={r}
              onClick={() => setForm((p) => ({ ...p, role: r }))}
              className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                form.role === r ? 'bg-amazon-dark text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r === 'customer' ? '🛒 Customer' : '🏪 Seller'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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
                placeholder="Minimum 6 characters"
                required
                minLength={6}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <hr className="my-4" />

        <div className="text-center">
          <span className="text-sm text-gray-600">Already have an account?</span>{' '}
          <Link href="/login" className="text-sm text-amazon-teal hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-amazon-orange border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
