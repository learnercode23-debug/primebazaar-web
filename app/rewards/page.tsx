'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiStar, FiGift, FiShoppingBag, FiShare2, FiAward } from 'react-icons/fi'

const TIERS = [
  { name: 'Silver',   min: 0,    max: 999,  color: 'from-gray-400 to-gray-500',    perks: ['1 point per Rs.20 spent', 'Birthday bonus 100 pts'] },
  { name: 'Gold',     min: 1000, max: 4999, color: 'from-amber-400 to-yellow-500', perks: ['1.5x points multiplier', 'Early deal access', 'Free shipping on orders Rs.300+'] },
  { name: 'Platinum', min: 5000, max: 9999, color: 'from-violet-500 to-indigo-600',perks: ['2x points multiplier', 'Priority support', 'Free express shipping'] },
  { name: 'Diamond',  min: 10000,max: Infinity,color:'from-cyan-400 to-blue-600', perks: ['3x points multiplier', 'Dedicated account manager', 'Exclusive member sales'] },
]

const HOW_TO_EARN = [
  { icon: '🛍️', action: 'Make a purchase',      pts: '1 pt per Rs.20' },
  { icon: '⭐', action: 'Write a review',         pts: '50 pts' },
  { icon: '👥', action: 'Refer a friend',         pts: '200 pts' },
  { icon: '📱', action: 'Download the app',       pts: '100 pts' },
  { icon: '🎂', action: 'Birthday bonus',         pts: '100 pts' },
  { icon: '📧', action: 'Subscribe to newsletter',pts: '25 pts' },
]

interface HistoryItem { date: string; desc: string; pts: number; type: 'earn' | 'redeem' }

export default function RewardsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [redeemAmt, setRedeemAmt] = useState(0)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    axios.get('/api/rewards').then(r => {
      setBalance(r.data.data.balance || 0)
      setHistory(r.data.data.history || [])
    }).catch(() => {})
  }, [user, loading, router])

  if (loading || !user) return null

  const currentTier = TIERS.find(t => balance >= t.min && balance <= t.max) || TIERS[0]
  const nextTier = TIERS[TIERS.findIndex(t => t.name === currentTier.name) + 1]
  const toNext = nextTier ? nextTier.min - balance : 0
  const progress = nextTier
    ? Math.min(100, Math.round(((balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
    : 100
  const rsValue = Math.floor(balance / 10)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header card */}
      <div className={`bg-gradient-to-br ${currentTier.color} rounded-3xl p-7 text-white shadow-xl`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FiAward className="text-xl" />
              <span className="text-sm font-bold opacity-90">Primepasal Rewards</span>
            </div>
            <p className="text-sm opacity-80 mb-1">{user.name}</p>
            <p className="text-5xl font-black">{balance.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-0.5">PP Points · ≈ Rs.{rsValue} value</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-white/20 backdrop-blur px-4 py-1.5 rounded-full font-black text-sm">{currentTier.name} Member</span>
            {nextTier && (
              <p className="text-xs opacity-75 mt-2">{toNext} pts to {nextTier.name}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div className="mt-5">
            <div className="flex justify-between text-xs opacity-75 mb-1">
              <span>{currentTier.name}</span><span>{nextTier.name}</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3 mt-5 flex-wrap">
          <Link href="/products" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
            <FiShoppingBag className="text-sm" /> Earn Points
          </Link>
          <Link href="/referral" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
            <FiShare2 className="text-sm" /> Refer a Friend (+200 pts)
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Redeem */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2"><FiGift /> Redeem Points</h2>
          <p className="text-xs text-gray-500 mb-4">10 pts = Rs.1 off your order. Min 100 pts.</p>
          <div className="space-y-3">
            {[100, 200, 500].filter(a => a <= balance).map(amt => (
              <button
                key={amt}
                onClick={() => setRedeemAmt(amt)}
                className={`w-full flex items-center justify-between border-2 rounded-xl px-4 py-3 transition-all ${redeemAmt === amt ? 'border-violet-600 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}
              >
                <span className="font-bold text-sm">{amt} pts</span>
                <span className="text-xs text-violet-700 font-semibold">= Rs.{amt / 10} discount</span>
              </button>
            ))}
            <Link
              href={`/checkout${redeemAmt ? `?redeemPoints=${redeemAmt}` : ''}`}
              className={`block w-full text-center font-bold py-2.5 rounded-xl text-sm transition-colors ${redeemAmt ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}
            >
              {redeemAmt ? `Apply ${redeemAmt} pts at checkout →` : 'Select an amount above'}
            </Link>
          </div>
        </div>

        {/* How to earn */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2"><FiStar /> Ways to Earn</h2>
          <div className="space-y-2.5">
            {HOW_TO_EARN.map(({ icon, action, pts }) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-2"><span>{icon}</span>{action}</span>
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier benefits */}
      <div>
        <h2 className="font-black text-gray-900 text-lg mb-4">Membership Tiers</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          {TIERS.map(tier => (
            <div key={tier.name} className={`rounded-2xl p-4 ${tier.name === currentTier.name ? 'ring-2 ring-violet-600' : ''} bg-gradient-to-br ${tier.color} text-white`}>
              <p className="font-black text-base mb-0.5">{tier.name}</p>
              <p className="text-xs opacity-75 mb-3">{tier.min.toLocaleString()}+ pts</p>
              <ul className="space-y-1.5">
                {tier.perks.map(p => (
                  <li key={p} className="text-xs flex gap-1.5"><span>✓</span>{p}</li>
                ))}
              </ul>
              {tier.name === currentTier.name && (
                <span className="mt-3 inline-block text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold">Your tier</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900">Points History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">No points activity yet — make a purchase or write a review to start earning.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.desc}</p>
                  <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <span className={`font-black text-sm ${item.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                  {item.type === 'earn' ? '+' : ''}{item.pts} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
