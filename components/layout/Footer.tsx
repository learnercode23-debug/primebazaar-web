'use client'

import Link from 'next/link'
import { FiFacebook, FiTwitter, FiInstagram, FiYoutube, FiMail, FiArrowUp, FiShield, FiTruck, FiRefreshCw, FiHeadphones } from 'react-icons/fi'
import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setEmail('')
    setTimeout(() => setSubscribed(false), 4000)
  }

  return (
    <footer className="bg-[#0F0D2A] text-white mt-auto">

      {/* Trust bar */}
      <div className="border-b border-white/5 bg-[#1A1740]">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: FiTruck,      label: 'Free Shipping',   sub: 'On orders over Rs. 999' },
            { icon: FiShield,     label: 'Secure Payment',  sub: '100% protected checkout' },
            { icon: FiRefreshCw,  label: 'Easy Returns',    sub: '7-day return policy' },
            { icon: FiHeadphones, label: '24/7 Support',    sub: 'Always here to help' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                <Icon className="text-violet-400 text-lg" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{label}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-lg text-white">Stay in the loop 📬</p>
            <p className="text-sm text-gray-400">Get deals, new arrivals, and offers straight to your inbox.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-white/8 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap btn-gradient press-effect"
            >
              {subscribed ? '✓ Subscribed!' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Main links */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-sm mb-4 text-white/90 uppercase tracking-widest text-xs">Company</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              ['About Primepasal',    '/about'],
              ['Careers',             '/careers'],
              ['Press Releases',      '/press'],
              ['Investor Relations',  '/investor-relations'],
              ['⭐ PP Rewards',        '/rewards'],
              ['⚡ Plus Membership',   '/membership'],
              ['🎁 Refer a Friend',    '/referral'],
            ].map(([label, href]) => (
              <li key={label}><Link href={href} className="hover:text-violet-400 transition-colors link-underline inline-block">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-xs mb-4 text-white/90 uppercase tracking-widest">Sell With Us</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              ['Sell on Primepasal',       '/register?role=seller'],
              ['Become an Affiliate',      '/register?role=seller'],
              ['Advertise Your Products',  '/register?role=seller'],
              ['Seller Dashboard',         '/seller'],
            ].map(([label, href]) => (
              <li key={label}><Link href={href} className="hover:text-violet-400 transition-colors link-underline inline-block">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-xs mb-4 text-white/90 uppercase tracking-widest">Help</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              ['Your Account',          '/profile'],
              ['Your Orders',           '/orders'],
              ['Shipping Policies',     '/support'],
              ['Returns & Replacements','/returns'],
              ['Help Center',           '/support'],
            ].map(([label, href]) => (
              <li key={label}><Link href={href} className="hover:text-violet-400 transition-colors link-underline inline-block">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-xs mb-4 text-white/90 uppercase tracking-widest">Shop</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {[
              ['Electronics',      '/products?category=Electronics'],
              ['Fashion',          '/products?category=Fashion'],
              ['🥬 Primepasal Fresh', '/fresh'],
              ['♻️ Renewed',         '/renewed'],
              ['⚡ Digital',         '/digital'],
              ['🎁 Gift Cards',      '/gift-cards'],
            ].map(([label, href]) => (
              <li key={label}><Link href={href} className="hover:text-violet-400 transition-colors link-underline inline-block">{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="flex items-baseline leading-none">
              <span className="font-black text-white text-xl">Prime</span>
              <span className="font-black text-orange-400 text-xl">Pasal</span>
            </div>
            <span className="text-gray-600 text-xs hidden sm:block">|</span>
            <p className="text-xs text-gray-500 hidden sm:block">© {new Date().getFullYear()} Primepasal. All rights reserved.</p>
          </div>

          <div className="flex gap-2">
            {[
              { href: 'https://www.facebook.com/profile.php?id=61590464048675', icon: FiFacebook, label: 'Facebook' },
              { href: 'https://twitter.com/primepasal',   icon: FiTwitter,   label: 'Twitter' },
              { href: 'https://instagram.com/primepasal', icon: FiInstagram, label: 'Instagram' },
              { href: 'https://youtube.com/@primepasal',  icon: FiYoutube,   label: 'YouTube' },
            ].map(({ href, icon: Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-violet-600 flex items-center justify-center text-gray-400 hover:text-white transition-all press-effect"
                aria-label={label}>
                <Icon className="text-base" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms</Link>
            <span>·</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1 hover:text-violet-400 transition-colors"
            >
              <FiArrowUp className="text-xs" /> Top
            </button>
          </div>

        </div>
        <p className="text-center text-xs text-gray-600 pb-4 sm:hidden">© {new Date().getFullYear()} Primepasal. All rights reserved.</p>
      </div>
    </footer>
  )
}
