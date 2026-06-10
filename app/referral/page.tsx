'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiCopy, FiCheck, FiShare2, FiGift, FiUsers, FiDollarSign } from 'react-icons/fi'

interface Referral { name: string; date: string; status: string; earned: number }

export default function ReferralPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [totalEarned, setTotalEarned] = useState(0)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    axios.get('/api/referral').then(r => {
      const d = r.data.data
      setCode(d.code || '')
      setReferrals(d.referrals || [])
      setTotalEarned(d.totalEarned || 0)
    }).catch(() => {})
  }, [user, loading, router])

  if (loading || !user) return null

  const link = code ? `https://www.primepasal.com/register?ref=${code}` : 'https://www.primepasal.com/register'

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: 'Join Primepasal!', text: `Use my code ${code} and get Rs.100 off your first order!`, url: link })
    } else {
      copy()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-3xl p-8 text-white text-center shadow-2xl shadow-violet-300/40">
        <div className="text-5xl mb-3">🎁</div>
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Refer friends, earn rewards</h1>
        <p className="text-white/80 mb-6 text-sm max-w-sm mx-auto">
          Share your code. Your friend gets <strong className="text-amber-300">Rs.100 off</strong> their first order. You earn <strong className="text-amber-300">200 PP Points</strong> (≈ Rs.20).
        </p>

        {/* Code box */}
        <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-4 mb-4 max-w-xs mx-auto">
          <p className="text-xs text-white/70 mb-1">Your referral code</p>
          <p className="text-2xl font-black tracking-widest text-amber-300">{code}</p>
        </div>

        {/* Link copy */}
        <div className="flex gap-2 max-w-sm mx-auto">
          <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-xs text-white/80 truncate text-left">
            {link}
          </div>
          <button
            onClick={copy}
            className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1 flex-shrink-0"
          >
            {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <button
          onClick={share}
          className="mt-3 flex items-center gap-2 mx-auto bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-colors"
        >
          <FiShare2 /> Share via WhatsApp / Viber
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FiUsers,     label: 'Friends referred',  value: referrals.length },
          { icon: FiCheck,     label: 'Completed',         value: referrals.filter(r => r.status === 'Completed').length },
          { icon: FiDollarSign,label: 'Points earned',     value: `${totalEarned} pts` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <Icon className="mx-auto text-violet-500 text-xl mb-2" />
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2"><FiGift /> How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Share your code',    desc: 'Send your unique link to friends via WhatsApp, Viber, or social media.' },
            { step: '2', title: 'Friend signs up',    desc: 'They register using your link and get Rs.100 off their first order.' },
            { step: '3', title: 'You earn points',    desc: 'Once they complete their first purchase, 200 PP Points land in your account.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-black text-base flex items-center justify-center mx-auto mb-3">{step}</div>
              <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral list */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Your referrals</h2>
        </div>
        {referrals.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">No referrals yet — share your code to get started!</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
                  </span>
                  {r.earned > 0 && <p className="text-xs text-green-600 font-bold mt-0.5">+{r.earned} pts</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
