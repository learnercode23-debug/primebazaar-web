'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiShoppingCart, FiUser, FiMenu, FiX,
  FiHeart, FiPackage, FiLogOut, FiSettings,
  FiChevronDown, FiMapPin, FiDollarSign
} from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import SearchAutocomplete from './SearchAutocomplete'
import MegaMenu from './MegaMenu'
import NotificationBell from '@/components/ui/NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const router = useRouter()

  const [mobileOpen, setMobileOpen]     = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

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
    <header className="sticky top-0 z-50 shadow-md">

      {/* ════════════════════════════════════════════
          DESKTOP NAVBAR
          ════════════════════════════════════════════ */}
      <div className="bg-amazon-dark">
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
                  className="text-white hover:ring-1 hover:ring-white rounded px-2 py-1 flex flex-col items-start"
                >
                  <span className="text-xs text-gray-400 hidden md:block">
                    {user ? `Hello, ${user.name.split(' ')[0]}` : 'Hello, sign in'}
                  </span>
                  <span className="text-xs font-bold flex items-center gap-0.5">
                    <span className="hidden sm:inline">Account</span>
                    <FiChevronDown className="text-xs hidden sm:inline" />
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {!user ? (
                      <>
                        <Link href="/login" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiUser /> Sign In</Link>
                        <Link href="/register" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Create Account</Link>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="font-semibold text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiSettings /> My Account</Link>
                        <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiPackage /> My Orders</Link>
                        <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiHeart /> Wishlist</Link>
                        <Link href="/addresses" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiMapPin /> My Addresses</Link>
                        <Link href="/support" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>💬 Help & Support</Link>
                        {(user.role === 'seller' || user.role === 'admin') && (
                          <Link href="/seller" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiPackage /> Seller Hub</Link>
                        )}
                        {user.role === 'seller' && (
                          <Link href="/seller/earnings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiDollarSign /> Earnings</Link>
                        )}
                        {user.role === 'admin' && (
                          <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiSettings /> Admin</Link>
                        )}
                        <hr className="my-1" />
                        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><FiLogOut /> Sign Out</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Notification bell */}
              <NotificationBell />

              <Link href="/wishlist" className="hidden md:flex items-center text-white hover:ring-1 hover:ring-white rounded p-2"><FiHeart className="text-xl" /></Link>

              {/* Mobile: user icon */}
              <Link href={user ? '/profile' : '/login'} className="sm:hidden flex items-center text-white p-2 rounded">
                <FiUser className="text-xl" />
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative flex items-center text-white hover:ring-1 hover:ring-white rounded p-2">
                <FiShoppingCart className="text-xl sm:text-2xl" />
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-amazon-orange text-gray-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {/* Hamburger — desktop only */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="hidden sm:flex text-white p-2 rounded hover:ring-1 hover:ring-white" aria-label="Menu">
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
      <div className="hidden sm:block bg-amazon-blue text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-10 gap-4 overflow-x-auto scrollbar-hide">
            <MegaMenu />
            {[
              { label: "Today's Deals 🔥", href: '/products?dealOfDay=true' },
              { label: '⚡ Lightning Deals', href: '/products?lightning=true' },
              { label: '🏆 Best Sellers', href: '/products?sort=salesCount&order=desc' },
              { label: '🆕 New Releases', href: '/products?sort=createdAt&order=desc' },
              { label: '📦 Free Delivery', href: '/products?freeShipping=true' },
            ].map(({ label, href }) => (
              <Link key={href} href={href} className="text-sm hover:underline whitespace-nowrap hover:text-amazon-yellow transition-colors">
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
        <div className="sm:hidden bg-white border-b shadow-lg">
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
                <div className="px-3 py-2 mb-2 bg-brand-50 rounded-xl">
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
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
