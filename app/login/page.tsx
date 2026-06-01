'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff, FiArrowLeft, FiMail, FiLock, FiZap } from 'react-icons/fi'
import axios from 'axios'

type Step = 'email' | 'new-user' | 'password'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()

  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await axios.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
      if (res.data.exists) {
        setUserName(res.data.name || '')
        setStep('password')
      } else {
        setStep('new-user')
      }
    } catch {
      setStep('password')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success(`Welcome back${userName ? ', ' + userName.split(' ')[0] : ''}!`)
      router.push('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Incorrect password'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(e: string, p: string) {
    setEmail(e); setPassword(p); setStep('password')
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

      <div className="w-full max-w-sm">

        {/* ── STEP 1: Email ─────────────────────────────────── */}
        {step === 'email' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email or mobile number</p>

            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email or mobile number
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                    placeholder="you@example.com"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200"
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4 leading-5">
              By continuing, you agree to Primebazaar&apos;s{' '}
              <Link href="/terms" className="underline hover:text-violet-600">Conditions of Use</Link>{' '}
              and <Link href="/privacy" className="underline hover:text-violet-600">Privacy Notice</Link>.
            </p>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">New to Primebazaar?</span></div>
            </div>

            <Link
              href="/register"
              className="block w-full text-center border-2 border-violet-200 text-violet-700 font-semibold py-3 rounded-xl hover:bg-violet-50 transition-all text-sm"
            >
              Create your Primebazaar account
            </Link>

            {/* Demo quick login */}
            <div className="mt-6 p-4 bg-violet-50 border border-violet-100 rounded-xl">
              <p className="text-xs font-bold text-violet-700 mb-2 flex items-center gap-1">
                <FiZap className="text-amber-500" /> Demo accounts
              </p>
              <div className="space-y-1.5">
                {[
                  ['Customer', 'alice@customer.com', 'customer123'],
                  ['Seller', 'tech@seller.com', 'seller123'],
                  ['Admin', 'admin@primebazaar.com', 'admin123'],
                ].map(([role, e, p]) => (
                  <button
                    key={role}
                    onClick={() => quickLogin(e, p)}
                    className="w-full text-left text-xs text-violet-600 hover:text-violet-800 hover:underline flex items-center gap-2"
                  >
                    <span className="font-semibold w-16">{role}</span>
                    <span className="text-gray-500">{e}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2a: New user ─────────────────────────────── */}
        {step === 'new-user' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => setStep('email')} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back
            </button>

            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Looks like you&apos;re new here!</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              We couldn&apos;t find an account for<br />
              <span className="font-semibold text-gray-700">{email}</span>
            </p>

            <Link
              href={`/register?email=${encodeURIComponent(email)}`}
              className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200 mb-3"
            >
              Create your Primebazaar account
            </Link>

            <button
              onClick={() => { setEmail(''); setStep('email') }}
              className="block w-full text-center text-violet-600 hover:text-violet-800 text-sm font-medium py-2 transition-colors"
            >
              Sign in with another email
            </button>
          </div>
        )}

        {/* ── STEP 2b: Password ─────────────────────────────── */}
        {step === 'password' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => { setStep('email'); setPassword('') }} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back
            </button>

            {userName && (
              <p className="text-gray-600 text-sm mb-1">
                Welcome back, <span className="font-bold text-gray-900">{userName.split(' ')[0]}</span>
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Enter password</h1>
            <p className="text-sm text-gray-500 mb-6">for <span className="font-medium text-violet-700">{email}</span></p>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                    placeholder="Your password"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-violet-600">Terms of Service</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
