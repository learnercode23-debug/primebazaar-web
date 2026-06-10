'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  FiShoppingCart, FiUser, FiMenu, FiX,
  FiHeart, FiPackage, FiLogOut, FiSettings,
  FiChevronDown, FiMapPin, FiDollarSign, FiMessageSquare,
  FiSun, FiMoon, FiStar, FiZap,
} from 'react-icons/fi'
import { useTheme } from '@/contexts/ThemeContext'
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
  const router = useRouter()

  const pathname = usePathname()
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [rewardPoints, setRewardPoints]   = useState<number | null>(null)

  // Poll unread message count every 30s
  useEffect(() => {
    if (!user) return
    const fetch = () => axios.get('/api/messages/unread').then(r => setUnreadMessages(r.data.count || 0)).catch(() => {})
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [user])

  // Real rewards balance for the points badge
  useEffect(() => {
    if (!user) { setRewardPoints(null); return }
    axios.get('/api/rewards').then(r => setRewardPoints(r.data?.data?.balance ?? 0)).catch(() => setRewardPoints(null))
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
    <header className="sticky top-0 z-50 shadow-xl shadow-indigo-950/30">

      {/* Brand accent line */}
      <div className="h-0.5 bg-gradient-to-r from-violet-500 via-orange-400 to-violet-500" />

      {/* ════════════════════════════════════════════
          DESKTOP NAVBAR
          ════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#1E1B4B] via-[#251D5E] to-[#2D1B69]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">

          {/* ── Row 1: Logo + Icons (all screens) ── */}
          <div className="flex items-center h-12 sm:h-16 gap-2 sm:gap-3">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 group">
              <span className="relative">
                <span className="absolute inset-0 bg-violet-500/40 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform" />
                <img src="/brand/bag.png" alt="" className="relative h-9 sm:h-11 w-auto drop-shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200" />
              </span>
              <span className="flex items-baseline leading-none">
                <span className="font-black text-white text-xl sm:text-2xl tracking-tight">Prime</span>
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 text-xl sm:text-2xl tracking-tight">Pasal</span>
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
                  className="flex items-center gap-2 text-white hover:bg-white/10 rounded-full px-2.5 py-1.5 transition-all"
                >
                  {user ? <UserAvatar name={user.name} /> : <FiUser className="text-lg" />}
                  <div className="hidden md:flex flex-col items-start leading-none">
                    {user ? (
                      <>
                        <span className="text-[10px] text-gray-400">Hello, {user.name.split(' ')[0]}</span>
                        <span className="text-xs font-bold flex items-center gap-0.5 mt-0.5">Account <FiChevronDown className="text-[10px]" /></span>
                      </>
                    ) : (
                      <span className="text-xs font-bold flex items-center gap-0.5">Sign In <FiChevronDown className="text-[10px]" /></span>
                    )}
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
                          {(user.role === 'delivery' || user.role === 'admin') && (
                            <Link href="/delivery" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors" onClick={() => setUserMenuOpen(false)}>🛵 Delivery Dashboard</Link>
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

              {/* Hairline divider */}
              <span className="hidden md:block w-px h-6 bg-white/10 mx-1" />

              {/* Notification bell */}
              <NotificationBell />

              {/* Messages */}
              {user && (
                <Link href="/messages" title="Messages" className="relative hidden md:flex items-center justify-center w-10 h-10 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <FiMessageSquare className="text-xl" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 bg-violet-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-md ring-2 ring-[#1E1B4B]">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
              )}

              <Link href="/wishlist" aria-label="Wishlist" title="Wishlist" className="hidden md:flex items-center justify-center w-10 h-10 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-all"><FiHeart className="text-xl" /></Link>

              {/* Hairline divider */}
              <span className="hidden lg:block w-px h-6 bg-white/10 mx-1" />

              {/* Rewards points badge — real balance */}
              {user && rewardPoints !== null && (
                <Link href="/rewards" title="Your reward points" className="hidden lg:flex items-center gap-1.5 text-white/80 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 rounded-full px-3 py-1.5 transition-all text-xs font-bold hover:scale-105">
                  <FiStar className="text-amber-400 text-sm" />
                  <span className="text-amber-300">{rewardPoints.toLocaleString()} pts</span>
                </Link>
              )}

              {/* Plus badge */}
              <Link href="/membership" className="hidden lg:flex items-center gap-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white rounded-full px-3 py-1.5 text-[10px] font-black transition-all shadow-lg shadow-violet-900/50 ring-1 ring-white/20 hover:scale-105">
                <FiZap className="text-[10px] text-amber-300" /> Plus
              </Link>

              {/* Mobile: user icon */}
              <Link href={user ? '/profile' : '/login'} className="sm:hidden flex items-center text-white/80 hover:text-white p-2 rounded-xl">
                {user ? <UserAvatar name={user.name} /> : <FiUser className="text-xl" />}
              </Link>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-all theme-icon"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark'
                  ? <FiSun className="text-xl text-amber-300" />
                  : <FiMoon className="text-xl" />
                }
              </button>

              {/* Cart — primary action */}
              <Link href="/cart" aria-label="Cart"
                className="relative flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-gray-900 rounded-full px-2.5 sm:px-3.5 py-2 transition-all shadow-lg shadow-orange-950/30 hover:scale-105 group ml-0.5">
                <FiShoppingCart className="text-lg sm:text-xl group-hover:scale-110 transition-transform" />
                <span className="hidden lg:inline text-xs font-black">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-indigo-900 text-[9px] font-black rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none shadow-md ring-2 ring-[#1E1B4B]">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Hamburger — mobile only */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="flex sm:hidden text-white p-2 rounded-xl hover:bg-white/10 transition-colors" aria-label="Menu">
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
      <div className="hidden sm:block bg-[#272363]/95 border-t border-white/[0.06] backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-11 gap-0.5 overflow-x-auto scrollbar-hide">
            <MegaMenu />
            <span className="w-px h-5 bg-white/10 mx-1.5 flex-shrink-0" />
            {[
              { label: '🏷️ All Deals',      ariaLabel: 'All Deals',               href: '/deals' },
              { label: "Today's Deals 🔥",  ariaLabel: "Today's Deals",           href: '/products?dealOfDay=true' },
              { label: '⚡ Lightning Deals', ariaLabel: 'Lightning Deals',         href: '/products?lightning=true' },
              { label: '🏆 Best Sellers',    ariaLabel: 'Best Sellers',            href: '/products?sort=salesCount&order=desc' },
              { label: '🆕 New Releases',    ariaLabel: 'New Releases',            href: '/products?sort=createdAt&order=desc' },
              { label: '🥬 Fresh',           ariaLabel: 'PrimePasal Fresh grocery',href: '/fresh' },
              { label: '♻️ Renewed',         ariaLabel: 'Renewed — refurbished',   href: '/renewed' },
              { label: '💾 Digital',         ariaLabel: 'Digital products',        href: '/digital' },
              { label: '🎁 Gift Cards',      ariaLabel: 'Gift Cards',              href: '/gift-cards' },
            ].map(({ label, ariaLabel, href }) => {
              const isActive = !href.includes('?') && pathname === href
              return (
                <Link key={href} href={href} aria-label={ariaLabel}
                  className={`relative text-[13px] whitespace-nowrap px-3 py-2.5 transition-colors
                    after:absolute after:left-3 after:right-3 after:bottom-1 after:h-0.5 after:rounded-full
                    after:bg-gradient-to-r after:from-orange-400 after:to-amber-400
                    after:transition-transform after:origin-left
                    ${isActive
                      ? 'text-white font-bold after:scale-x-100'
                      : 'text-white/70 hover:text-white font-medium after:scale-x-0 hover:after:scale-x-100'
                    }`}>
                  {label}
                </Link>
              )
            })}
            {/* Live — animated pulse dot */}
            <Link href="/live" aria-label="Live Shopping"
              className={`relative flex items-center gap-1.5 text-[13px] whitespace-nowrap px-3 py-2.5 transition-colors
                after:absolute after:left-3 after:right-3 after:bottom-1 after:h-0.5 after:rounded-full
                after:bg-gradient-to-r after:from-red-400 after:to-rose-400
                after:transition-transform after:origin-left
                ${pathname === '/live'
                  ? 'text-white font-bold after:scale-x-100'
                  : 'text-white/70 hover:text-white font-medium after:scale-x-0 hover:after:scale-x-100'
                }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live
            </Link>
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
                {(user.role === 'delivery' || user.role === 'admin') && (
                  <Link href="/delivery" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>🛵 Delivery Dashboard</Link>
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
