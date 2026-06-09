'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiShoppingCart, FiUser, FiMenu, FiX,
  FiHeart, FiPackage, FiLogOut, FiSettings,
  FiChevronDown, FiMapPin, FiDollarSign, FiMessageSquare,
  FiSun, FiMoon, FiStar, FiZap,
} from 'react-icons/fi'
import { useTheme } from '@/contexts/ThemeContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import axios from 'axios'
import SearchAutocomplete from './SearchAutocomplete'
import MegaMenu from './MegaMenu'
import NotificationBell from '@/components/ui/NotificationBell'

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-md flex-shrink-0">
      {initials}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const { theme, toggle: toggleTheme } = useTheme()
  const { lang, setLang } = useLang()
  const router = useRouter()

  const [mobileOpen, setMobileOpen]       = useState(false)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Poll unread message count every 30s
  useEffect(() => {
    if (!user) return
    const fetch = () => axios.get('/api/messages/unread').then(r => setUnreadMessages(r.data.count || 0)).catch(() => {})
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [user])

  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 shadow-lg shadow-black/20">

      {/* ════════════════════════════════════════════
          DESKTOP NAVBAR
          ════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#2D1B69]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">

          {/* ── Row 1: Logo + Icons (all screens) ── */}
          <div className="flex items-center h-12 sm:h-16 gap-2 sm:gap-3">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-1.5">
              <img src="/brand/bag.png" alt="" className="h-9 sm:h-11 w-auto drop-shadow-md" />
              <span className="flex items-baseline leading-none">
                <span className="font-black text-white text-xl sm:text-2xl tracking-tight">Prime</span>
                <span className="font-black text-orange-400 text-xl sm:text-2xl tracking-tight">Pasal</span>
              </span>
            </Link>

            {/* Search — DESKTOP only (mobile has its own row below) */}
            <div className="flex-1 min-w-0 hidden sm:block">
              <SearchAutocomplete className="w-full" />
            </div>

            {/* Spacer on mobile */}
            <div className="flex-1 sm:hidden" />

            {/* ── Right icons ── */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">

              {/* User — desktop */}
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-white hover:bg-white/10 rounded-xl px-2.5 py-1.5 transition-colors"
                >
                  {user ? <UserAvatar name={user.name} /> : <FiUser className="text-lg" />}
                  <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-[10px] text-gray-400">{user ? `Hello, ${user.name.split(' ')[0]}` : 'Hello, sign in'}</span>
                    <span className="text-xs font-bold flex items-center gap-0.5 mt-0.5">Account <FiChevronDown className="text-[10px]" /></span>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 py-2 z-50 animate-fade-blur-in">
                    {!user ? (
                      <div className="p-2 space-y-1">
                        <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors font-semibold" onClick={() => setUserMenuOpen(false)}><FiUser className="text-violet-500" /> Sign In</Link>
                        <Link href="/register" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}>Create Account</Link>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                          <UserAvatar name={user.name} />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{user.name}</p>
                            <p className="text-xs text-violet-500 font-semibold capitalize">{user.role}</p>
                          </div>
                        </div>
                        <div className="p-2 space-y-0.5">
                          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiSettings className="text-gray-400" /> My Account</Link>
                          <Link href="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiPackage className="text-gray-400" /> My Orders</Link>
                          <Link href="/wishlist" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiHeart className="text-gray-400" /> Wishlist</Link>
                          <Link href="/addresses" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiMapPin className="text-gray-400" /> My Addresses</Link>
                          <Link href="/support" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}>💬 Help & Support</Link>
                          {(user.role === 'seller' || user.role === 'admin') && (
                            <Link href="/seller" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiPackage className="text-gray-400" /> Seller Hub</Link>
                          )}
                          {user.role === 'seller' && (
                            <Link href="/seller/earnings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiDollarSign className="text-gray-400" /> Earnings</Link>
                          )}
                          {user.role === 'admin' && (
                            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}><FiSettings className="text-gray-400" /> Admin Panel</Link>
                          )}
                          <div className="pt-1 border-t border-gray-100 mt-1">
                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"><FiLogOut /> Sign Out</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Notification bell */}
              <NotificationBell />

              {/* Messages */}
              {user && (
                <Link href="/messages" className="relative hidden md:flex items-center text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-colors">
                  <FiMessageSquare className="text-xl" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 bg-violet-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-md">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
              )}

              <Link href="/wishlist" aria-label="Wishlist" className="hidden md:flex items-center text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-colors"><FiHeart className="text-xl" /></Link>

              {/* Rewards points badge */}
              {user && (
                <Link href="/rewards" className="hidden lg:flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl px-2.5 py-1.5 transition-colors text-xs font-bold">
                  <FiStar className="text-amber-400 text-sm" />
                  <span className="text-amber-300">620 pts</span>
                </Link>
              )}

              {/* Plus badge */}
              <Link href="/membership" className="hidden lg:flex items-center gap-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-full px-2.5 py-1 text-[10px] font-black transition-all shadow-md">
                <FiZap className="text-[10px] text-amber-300" /> Plus
              </Link>

              {/* Mobile: user icon */}
              <Link href={user ? '/profile' : '/login'} className="sm:hidden flex items-center text-white/80 hover:text-white p-2 rounded-xl">
                {user ? <UserAvatar name={user.name} /> : <FiUser className="text-xl" />}
              </Link>

              {/* Language toggle */}
              <button
                onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
                className="flex items-center gap-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl px-2 py-1.5 transition-all text-xs font-bold"
                aria-label="Switch language"
                title={lang === 'en' ? 'Switch to Nepali' : 'Switch to English'}
              >
                {lang === 'en' ? '🇳🇵 NE' : '🇬🇧 EN'}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all theme-icon"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark'
                  ? <FiSun className="text-xl text-amber-300" />
                  : <FiMoon className="text-xl" />
                }
              </button>

              {/* Cart */}
              <Link href="/cart" aria-label="Cart" className="relative flex items-center text-white hover:bg-white/10 rounded-xl p-2 transition-colors group">
                <FiShoppingCart className="text-xl sm:text-2xl group-hover:scale-110 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-amber-400 to-orange-500 text-gray-900 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-md">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Hamburger — mobile only */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="flex sm:hidden text-white p-2 rounded hover:ring-1 hover:ring-white" aria-label="Menu">
                {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
            </div>
          </div>

          {/* ── Row 2: Search bar — MOBILE only ── */}
          <div className="sm:hidden pb-2">
            <SearchAutocomplete className="w-full" />
          </div>
        </div>
      </div>


      {/* ════════════════════════════════════════════
          SECONDARY NAV — desktop only
          ════════════════════════════════════════════ */}
      <div className="hidden sm:block bg-[#312E81] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-10 gap-1 overflow-x-auto scrollbar-hide">
            <MegaMenu />
            {[
              { label: '🏷️ All Deals', href: '/deals' },
              { label: "Today's Deals 🔥", href: '/products?dealOfDay=true' },
              { label: '⚡ Lightning Deals', href: '/products?lightning=true' },
              { label: '🏆 Best Sellers', href: '/products?sort=salesCount&order=desc' },
              { label: '🆕 New Releases', href: '/products?sort=createdAt&order=desc' },
              { label: '🥬 Fresh', href: '/fresh' },
              { label: '♻️ Renewed', href: '/renewed' },
              { label: '⚡ Digital', href: '/digital' },
              { label: '🎁 Gift Cards', href: '/gift-cards' },
              { label: '🔴 Live', href: '/live' },
            ].map(({ label, href }) => (
              <Link key={href} href={href} className="text-sm whitespace-nowrap px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all link-underline">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MOBILE HAMBURGER MENU
          ════════════════════════════════════════════ */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-b shadow-2xl shadow-black/10 animate-slide-in-up">
          <div className="p-4 space-y-1">
            {!user ? (
              <>
                <Link href="/login" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-800 font-semibold hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  <FiUser className="text-brand-600" /> Sign In
                </Link>
                <Link href="/register" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                  Create Account
                </Link>
              </>
            ) : (
              <>
                <div className="px-3 py-3 mb-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl flex items-center gap-3 border border-violet-100">
                  <UserAvatar name={user.name} />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                    <p className="text-xs text-violet-500 font-semibold capitalize">{user.role}</p>
                  </div>
                </div>
                <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}><FiSettings className="text-gray-400" /> My Account</Link>
                <Link href="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}><FiPackage className="text-gray-400" /> My Orders</Link>
                <Link href="/addresses" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}><FiMapPin className="text-gray-400" /> My Addresses</Link>
                <Link href="/support" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>💬 Help &amp; Support</Link>
                {(user.role === 'seller' || user.role === 'admin') && (
                  <Link href="/seller" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}><FiPackage className="text-gray-400" /> Seller Hub</Link>
                )}
                {user.role === 'admin' && (
                  <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}><FiSettings className="text-gray-400" /> Admin</Link>
                )}
                <hr className="my-1" />
                <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50"><FiLogOut /> Sign Out</button>
              </>
            )}
            <hr className="my-2" />
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Browse</p>
            {[
              ["🔥 Today's Deals", '/products?dealOfDay=true'],
              ['💻 Electronics', '/products?category=Electronics'],
              ['👗 Fashion', '/products?category=Fashion'],
              ['🏠 Home & Garden', '/products?category=Home+%26+Garden'],
              ['📚 Books', '/products?category=Books'],
              ['🔴 Live Shopping', '/live'],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
