'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiMail, FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'

type Step = 'email' | 'otp' | 'new-password' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // ── Step 1: Send OTP to email ──────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email })
      toast.success('OTP sent to your email!')
      setStep('otp')
      setResendTimer(60)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP input handlers ────────────────────────────────────────────────
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

  // ── Step 2: Verify OTP ────────────────────────────────────────────────
  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      // Verify OTP silently by trying to reset with a dummy — just advance to next step
      // (actual verification happens on password reset)
      setStep('new-password')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Reset password ────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await axios.post('/api/auth/reset-password', { email, otp: otp.join(''), newPassword })
      toast.success('Password reset successfully!')
      setStep('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Reset failed')
      if (msg?.includes('OTP') || msg?.includes('expired')) setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email })
      setOtp(['', '', '', '', '', ''])
      setResendTimer(60)
      toast.success('New OTP sent!')
    } catch {
      toast.error('Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 flex flex-col items-center justify-center py-12 px-4">

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-1 group">
        <span className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-violet-700 transition-colors">primebazaar</span>
        <span className="text-violet-600 text-4xl font-black leading-none">.</span>
      </Link>

      <div className="w-full max-w-sm">

        {/* ── STEP 1: Enter email ───────────────────────────────── */}
        {step === 'email' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <Link href="/login" className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back to Sign in
            </Link>

            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔑</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Forgot password?</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter your registered email and we&apos;ll send a 6-digit OTP to reset your password.
            </p>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registered email</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="email"
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
                {loading ? 'Sending OTP…' : 'Send OTP to Email'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Enter OTP ─────────────────────────────────── */}
        {step === 'otp' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <button onClick={() => setStep('email')} className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-6 hover:text-violet-800 transition-colors">
              <FiArrowLeft /> Back
            </button>

            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📧</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Check your email</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              We sent a 6-digit OTP to<br />
              <span className="font-bold text-violet-700">{email}</span>
            </p>

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
                  className={`w-11 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
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
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>

            <div className="text-center">
              <span className="text-sm text-gray-500">Didn&apos;t get the email? </span>
              <button
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                className="text-sm font-semibold text-violet-600 disabled:text-gray-400 hover:underline"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Check your Spam / Promotions folder if you don&apos;t see it.
            </p>
          </div>
        )}

        {/* ── STEP 3: New password ──────────────────────────────── */}
        {step === 'new-password' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8">
            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiLock className="text-2xl text-violet-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 text-center mb-6">Choose a strong password for your account.</p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    placeholder="At least 6 characters"
                    autoFocus
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm new password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-red-400' : 'border-gray-300'
                    }`}
                    placeholder="Repeat your password"
                    required
                  />
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Done ──────────────────────────────────────── */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-violet-100 shadow-lg shadow-violet-100/50 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="text-3xl text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md shadow-violet-200"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
