'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff, FiArrowLeft, FiMail, FiLock, FiZap, FiSmartphone } from 'react-icons/fi'
import axios from 'axios'

type Step = 'email' | 'new-user' | 'password' | 'phone-otp'

function isPhone(input: string) {
  const cleaned = input.replace(/[\s\-().]/g, '')
  return /^\+?[0-9]{7,15}$/.test(cleaned) && !input.includes('@')
}

function toE164(phone: string) {
  const cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) return '+977' + cleaned.slice(1)
  if (cleaned.startsWith('977')) return '+' + cleaned
  return '+977' + cleaned   // default Nepal
}

function LoginPageInner() {
  const { login, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === '1'
  const tokenError = searchParams.get('error')

  // Already logged in - redirect away from login page
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.replace('/admin')
      else if (user.role === 'seller') router.replace('/seller')
      else if (user.role === 'delivery') router.replace('/delivery')
      else router.replace('/')
    }
  }, [user, router])

  const [step, setStep]         = useState<Step>('email')
  const [input, setInput]       = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  // Phone OTP state
  const [phone, setPhone]           = useState('')
  const [otp, setOtp]               = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [devOtp, setDevOtp]         = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // â”€â”€ Step 1: Continue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)

    if (isPhone(input)) {
      // Phone OTP flow
      const e164 = toE164(input.trim())
      setPhone(e164)
      try {
        const res = await axios.post('/api/auth/otp/send', { phone: e164 })
        setDevOtp(res.data.devOtp || null)
        setStep('phone-otp')
        setResendTimer(60)
        toast.success('OTP sent to your mobile!')
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send OTP'
        toast.error(msg)
      }
    } else {
      // Email flow
      try {
        const res = await axios.get(`/api/auth/check-email?email=${encodeURIComponent(input)}`)
        if (res.data.exists) {
          setUserName(res.data.name || '')
          setStep('password')
        } else {
          setStep('new-user')
        }
      } catch {
        setStep('password')
      }
    }
    setLoading(false)
  }

  // â”€â”€ Email sign in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(input, password)
      toast.success(`Welcome back${userName ? ', ' + userName.split(' ')[0] : ''}!`)
      router.push('/')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Incorrect password')
    } finally {
      setLoading(false)
    }
  }

  // â”€â”€ Phone OTP digit input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function handleOtpDigit(val: string, idx: number) {
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      setOtp(val.split(''))
      inputRefs.current[5]?.focus()
      return
    }
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[idx] = digit; setOtp(next)
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus()
  }
  function handleOtpBack(idx: number) {
    if (!otp[idx] && idx > 0) {
      const next = [...otp]; next[idx - 1] = ''; setOtp(next)
      inputRefs.current[idx - 1]?.focus()
    } else {
      const next = [...otp]; next[idx] = ''; setOtp(next)
    }
  }

  // â”€â”€ Verify OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/otp/verify', { phone, otp: code })
      toast.success(res.data.isNewUser ? 'Account created! Welcome!' : 'Welcome back!')
      router.push('/')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // â”€â”€ Resend OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleResend() {
    if (resendTimer > 0) return
    try {
      const res = await axios.post('/api/auth/otp/send', { phone })
      setDevOtp(res.data.devOtp || null)
      setOtp(['', '', '', '', '', ''])
      setResendTimer(60)
      toast.success('New OTP sent!')
    } catch {
      toast.error('Failed to resend OTP')
    }
  }

  function quickLogin(e: string, p: string) {
    setInput(e); setPassword(p); setStep('password')
  }

  const inputIsPhone = isPhone(input)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex flex-col items-center justify-center py-12 px-4">

      <Link href="/" className="mb-8 flex items-center gap-1 group">
        <span className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-violet-700 transition-colors">PrimePasal</span>
        <span className="text-violet-600 text-4xl font-black leading-none">.</span>
      </Link>

      <div className="w-full max-w-sm">

        {verified && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 mb-4 text-center font-medium">
            Email verified! You can now sign in.
          </div>
        )}
        {tokenError === 'token-expired' && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3 mb-4 text-center">
            Verification link expired. Please register again.
          </div>
        )}
        {tokenError === 'invalid-token' && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3 mb-4 text-center">
            Invalid verification link.
          </div>
        )}

        {/* â”€â”€ STEP 1: Email or Phone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'email' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email or mobile number</p>

            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email or mobile number</label>
                <div className="relative">
                  {inputIsPhone
                    ? <FiSmartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500 text-sm" />
                    : <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  }
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                    placeholder="you@email.com or 98XXXXXXXX"
                    autoFocus
                    required
                  />
                </div>
                {inputIsPhone && (
                  <p className="text-xs text-violet-600 mt-1.5 flex items-center gap-1">
                    <FiSmartphone className="text-xs" />
                    We&apos;ll send a 6-digit OTP to <strong>+977 {input.replace(/\D/g,'')}</strong>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !input}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200"
              >
                {loading ? 'Please waitâ€¦' : inputIsPhone ? 'Send OTP â†’' : 'Continue'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4 leading-5">
              By continuing, you agree to PrimePasal&apos;s{' '}
              <Link href="/terms" className="underline hover:text-violet-600">Terms</Link> and{' '}
              <Link href="/privacy" className="underline hover:text-violet-600">Privacy Notice</Link>.
            </p>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">New to PrimePasal?</span></div>
            </div>

            <Link href="/register" className="block w-full text-center border-2 border-violet-200 text-violet-700 font-semibold py-3 rounded-xl hover:bg-violet-50 transition-all text-sm">
              Create your PrimePasal account
            </Link>

          </div>
        )}

        {/* â”€â”€ STEP 2a: New user (email) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'new-user' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => setStep('email')} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back
            </button>
            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">ðŸ‘‹</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Looks like you&apos;re new here!</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              No account found for<br /><span className="font-semibold text-gray-700">{input}</span>
            </p>
            <Link href={`/register?email=${encodeURIComponent(input)}`}
              className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200 mb-3">
              Create your PrimePasal account
            </Link>
            <button onClick={() => { setInput(''); setStep('email') }}
              className="block w-full text-center text-violet-600 hover:text-violet-800 text-sm font-medium py-2 transition-colors">
              Sign in with another email
            </button>
          </div>
        )}

        {/* â”€â”€ STEP 2b: Password (email) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'password' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => { setStep('email'); setPassword('') }} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back
            </button>
            {userName && <p className="text-gray-600 text-sm mb-1">Welcome back, <span className="font-bold text-gray-900">{userName.split(' ')[0]}</span></p>}
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Enter password</h1>
            <p className="text-sm text-gray-500 mb-6">for <span className="font-medium text-violet-700">{input}</span></p>

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
                    autoFocus required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || !password}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200">
                {loading ? 'Signing inâ€¦' : 'Sign in'}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link href="/forgot-password" className="text-sm text-violet-600 hover:underline font-medium">
                Forgot your password?
              </Link>
            </div>
          </div>
        )}

        {/* â”€â”€ STEP 3: Phone OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'phone-otp' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => { setStep('email'); setOtp(['','','','','','']) }} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800">
              <FiArrowLeft /> Back
            </button>

            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSmartphone className="text-2xl text-violet-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Verify your number</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter the 6-digit code sent to<br />
              <span className="font-bold text-violet-700">{phone}</span>
            </p>

            {/* Dev OTP hint */}
            {devOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-700">Dev mode â€” SMS not configured</p>
                  <p className="text-xs text-amber-600">OTP: <span className="font-mono font-black text-lg tracking-widest">{devOtp}</span></p>
                </div>
                <button onClick={() => setOtp(devOtp.split(''))}
                  className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  Auto-fill
                </button>
              </div>
            )}

            {/* 6 OTP boxes */}
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(r) => { inputRefs.current[i] = r }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpDigit(e.target.value, i)}
                  onKeyDown={(e) => e.key === 'Backspace' && handleOtpBack(i)}
                  autoFocus={i === 0}
                  className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                    ${digit ? 'border-violet-600 bg-violet-50 text-violet-800' : 'border-gray-300 text-gray-900'}
                    focus:border-violet-600 focus:bg-violet-50`}
                  style={{ height: '52px' }}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join('').length < 6}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200 mb-4"
            >
              {loading ? 'Verifyingâ€¦' : 'Verify & Continue'}
            </button>

            {/* Resend */}
            <div className="text-center">
              <span className="text-sm text-gray-500">Didn&apos;t receive it? </span>
              <button
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="text-sm font-semibold text-violet-600 disabled:text-gray-400 hover:underline disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}

