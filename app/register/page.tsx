'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiShoppingCart, FiShoppingBag } from 'react-icons/fi'

function RegisterForm() {
  const { register } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  const defaultEmail = params.get('email') || ''
  const defaultRole  = params.get('role')  || 'customer'

  const [form, setForm] = useState({ name: '', email: defaultEmail, password: '', role: defaultRole })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex flex-col items-center justify-center py-12 px-4">

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-1 group">
        <span className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-violet-700 transition-colors">
          primebazaar
        </span>
        <span className="text-violet-600 text-4xl font-black leading-none">.</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">

        <Link href="/login" className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
          <FiArrowLeft /> Back to sign in
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Join millions of shoppers on Primebazaar</p>

        {/* Role selector */}
        <div className="flex gap-3 mb-6">
          {[
            { value: 'customer', label: 'Customer', icon: <FiShoppingCart />, desc: 'Shop & buy' },
            { value: 'seller',   label: 'Seller',   icon: <FiShoppingBag />, desc: 'Sell products' },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, role: r.value }))}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                form.role === r.value
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-500 hover:border-violet-200 hover:bg-violet-50/50'
              }`}
            >
              <span className="text-lg">{r.icon}</span>
              <span>{r.label}</span>
              <span className="text-xs font-normal text-gray-400">{r.desc}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                placeholder="First and last name"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Passwords are case-sensitive and must be 6+ characters.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200 mt-2"
          >
            {loading ? 'Creating account...' : 'Create your Primebazaar account'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4 leading-5">
          By creating an account, you agree to Primebazaar&apos;s{' '}
          <Link href="/terms" className="underline hover:text-violet-600">Conditions of Use</Link>{' '}
          and <Link href="/privacy" className="underline hover:text-violet-600">Privacy Notice</Link>.
        </p>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">Already have an account?</span></div>
        </div>

        <Link
          href="/login"
          className="block w-full text-center border-2 border-violet-200 text-violet-700 font-semibold py-3 rounded-xl hover:bg-violet-50 transition-all text-sm"
        >
          Sign in instead
        </Link>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
