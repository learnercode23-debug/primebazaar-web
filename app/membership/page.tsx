'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiCheck, FiZap, FiShield, FiTruck, FiStar, FiHeadphones, FiGift } from 'react-icons/fi'

const BENEFITS = [
  { icon: FiTruck,      title: 'Free Shipping Always',     desc: 'Free on every order, no minimum threshold', free: false, plus: true },
  { icon: FiZap,        title: 'Early Deal Access',        desc: '30-min head start on Lightning Deals',      free: false, plus: true },
  { icon: FiStar,       title: '2× Reward Points',        desc: 'Earn double PP Points on all purchases',    free: false, plus: true },
  { icon: FiShield,     title: 'Extended Returns',         desc: '30-day returns vs standard 7 days',        free: false, plus: true },
  { icon: FiHeadphones, title: 'Priority Support',         desc: 'Skip the queue — dedicated Plus helpline', free: false, plus: true },
  { icon: FiGift,       title: 'Monthly Surprise Box',    desc: 'Curated product sample every month',        free: false, plus: true },
  { icon: FiCheck,      title: 'Basic Free Shipping',     desc: 'Free on orders above Rs.999',               free: true,  plus: true },
  { icon: FiCheck,      title: 'Loyalty Points',          desc: 'Earn 1 pt per Rs.20 spent',                free: true,  plus: true },
  { icon: FiCheck,      title: 'Wishlist & Compare',      desc: 'Save and compare products',                free: true,  plus: true },
]

export default function MembershipPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')

  const price = billing === 'yearly' ? 799 : 99
  const saving = billing === 'yearly' ? Math.round(((99 * 12 - 799) / (99 * 12)) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2 rounded-full font-black text-lg mb-4 shadow-lg shadow-violet-300">
          <FiZap /> PrimePasal Plus
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
          Shop smarter. Save more.
        </h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Unlock free shipping, double points, early deal access, and more — for one low price.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${billing === 'monthly' ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('yearly')}
          className={`px-5 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Yearly
          <span className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Save 33%</span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        {/* Free */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-7">
          <p className="font-black text-gray-900 text-xl mb-1">Free</p>
          <p className="text-4xl font-black text-gray-900 mb-1">Rs.0</p>
          <p className="text-sm text-gray-500 mb-6">Forever free</p>
          <Link href="/register" className="block text-center border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3 rounded-full text-sm transition-colors mb-6">
            Get Started Free
          </Link>
          <ul className="space-y-3">
            {BENEFITS.filter(b => b.free).map(b => (
              <li key={b.title} className="flex items-start gap-2 text-sm text-gray-700">
                <FiCheck className="text-green-500 flex-shrink-0 mt-0.5" />
                <div><p className="font-semibold">{b.title}</p><p className="text-xs text-gray-500">{b.desc}</p></div>
              </li>
            ))}
          </ul>
        </div>

        {/* Plus */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl shadow-violet-300/40">
          <div className="absolute top-4 right-4 bg-amber-400 text-gray-900 text-[10px] font-black px-3 py-1 rounded-full">
            MOST POPULAR
          </div>
          <div className="flex items-center gap-2 mb-1">
            <FiZap className="text-amber-300" />
            <p className="font-black text-xl">Plus</p>
          </div>
          <div className="flex items-end gap-2 mb-1">
            <p className="text-4xl font-black">Rs.{price}</p>
            <p className="text-white/70 pb-1">/{billing === 'yearly' ? 'yr' : 'mo'}</p>
          </div>
          {billing === 'yearly' && (
            <p className="text-green-300 text-xs font-bold mb-1">Save {saving}% vs monthly</p>
          )}
          <p className="text-white/70 text-sm mb-6">
            {billing === 'yearly' ? `Billed Rs.${price} once per year` : 'Billed monthly, cancel anytime'}
          </p>

          <button className="w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-black py-3 rounded-full text-sm transition-colors mb-6 shadow-md">
            Start Plus — Rs.{price}/{billing === 'yearly' ? 'yr' : 'mo'}
          </button>

          <ul className="space-y-3">
            {BENEFITS.map(b => (
              <li key={b.title} className="flex items-start gap-2 text-sm">
                <FiCheck className={`flex-shrink-0 mt-0.5 ${b.plus && !b.free ? 'text-amber-300' : 'text-white/60'}`} />
                <div>
                  <p className={`font-semibold ${b.plus && !b.free ? 'text-amber-200' : 'text-white/90'}`}>{b.title}</p>
                  <p className="text-white/60 text-xs">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="font-black text-gray-900 text-lg mb-5">Frequently asked questions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel before your renewal date and you keep benefits until the period ends.' },
            { q: 'Can I share my membership?', a: 'Plus membership applies to one account only, but your household members can each get their own.' },
            { q: 'What payment methods are accepted?', a: 'Khalti, eSewa, bank transfer, or cash via our nearest collection point.' },
            { q: 'Is there a free trial?', a: 'New users get a 7-day free trial of Plus automatically — no card required.' },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="font-bold text-sm text-gray-900 mb-1">{q}</p>
              <p className="text-sm text-gray-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
