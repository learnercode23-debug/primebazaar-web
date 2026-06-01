'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FiShoppingCart, FiUser, FiMenu, FiX,
  FiHeart, FiPackage, FiLogOut, FiSettings,
  FiChevronDown, FiMapPin, FiNavigation, FiLoader, FiCheck
} from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import SearchAutocomplete from './SearchAutocomplete'
import MegaMenu from './MegaMenu'
import NotificationBell from '@/components/ui/NotificationBell'

const QUICK_CITIES = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bharatpur', 'Biratnagar', 'Birgunj']

export default function Navbar() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const router = useRouter()

  const [mobileOpen, setMobileOpen]       = useState(false)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [locationOpen, setLocationOpen]   = useState(false)
  const [deliveryCity, setDeliveryCity]   = useState('Set location')
  const [locating, setLocating]           = useState(false)
  const [locationSaved, setLocationSaved] = useState(false)

  const userMenuRef     = useRef<HTMLDivElement>(null)
  const locationMenuRef = useRef<HTMLDivElement>(null)

  // Restore saved location
  useEffect(() => {
    const saved = localStorage.getItem('deliveryCity')
    if (saved) setDeliveryCity(saved)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (locationMenuRef.current && !locationMenuRef.current.contains(e.target as Node)) setLocationOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  async function detectLocation() {
    setLocating(true)
    setLocationSaved(false)
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
      )
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await r.json()
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Your Location'
      saveCity(city)
    } catch {
      alert('Unable to detect location. Please allow location access.')
    } finally {
      setLocating(false)
    }
  }

  function saveCity(city: string) {
    setDeliveryCity(city)
    localStorage.setItem('deliveryCity', city)
    setLocationSaved(true)
    setLocationOpen(false)
    setTimeout(() => setLocationSaved(false), 2000)
  }

  /* ── Location dropdown (shared by desktop + mobile) ── */
  function LocationDropdown() {
    return (
      <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[60]">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">📍 Choose Delivery Location</p>

        {/* GPS button */}
        <button
          onClick={detectLocation}
          disabled={locating}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-colors disabled:opacity-60 mb-3"
        >
          {locating
            ? <><FiLoader className="animate-spin text-base flex-shrink-0" /> Detecting your location…</>
            : <><FiNavigation className="text-base flex-shrink-0" /> Use my current location</>
          }
        </button>

        {/* Current city display */}
        {deliveryCity !== 'Set location' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
            <FiCheck className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Currently delivering to</p>
              <p className="text-sm font-bold text-gray-900">{deliveryCity}</p>
            </div>
          </div>
        )}

        {/* Quick city picks */}
        <p className="text-xs text-gray-400 mb-2">Or pick a city:</p>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => saveCity(city)}
              className={`text-xs py-2 px-1 rounded-xl text-center transition-all font-medium ${
                deliveryCity === city
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-brand-100 text-gray-700 hover:text-brand-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    )
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
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-white font-black text-base sm:text-xl tracking-tight">primebazaar</span>
              <span className="text-amazon-yellow text-xl sm:text-2xl font-black leading-none">.</span>
            </Link>

            {/* ── Deliver to — DESKTOP only ── */}
            <div className="relative hidden xl:block flex-shrink-0" ref={locationMenuRef}>
              <button
                onClick={() => setLocationOpen(!locationOpen)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all border ${
                  locationOpen ? 'ring-1 ring-white border-white/30' : 'border-transparent hover:border-white/20'
                }`}
              >
                {locating
                  ? <FiLoader className="text-amazon-yellow animate-spin text-base flex-shrink-0" />
                  : locationSaved
                  ? <FiCheck className="text-green-400 text-base flex-shrink-0" />
                  : <FiMapPin className="text-amazon-yellow text-base flex-shrink-0" />
                }
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 leading-tight">Deliver to</p>
                  <p className="text-xs font-bold text-white leading-tight max-w-[110px] truncate">
                    {locating ? 'Detecting…' : locationSaved ? 'Saved! ✓' : deliveryCity}
                  </p>
                </div>
                <FiChevronDown className={`text-gray-400 text-xs transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
              </button>
              {locationOpen && <LocationDropdown />}
            </div>

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
                        {(user.role === 'seller' || user.role === 'admin') && (
                          <Link href="/seller" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}><FiPackage /> Seller Hub</Link>
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
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MOBILE LOCATION BAR — always visible on mobile
          ════════════════════════════════════════════ */}
      <div className="sm:hidden bg-[#232050] border-t border-white/10">
        <div className="relative" ref={locationOpen ? locationMenuRef : undefined}>
          <button
            onClick={() => setLocationOpen(!locationOpen)}
            className="w-full flex items-center gap-2 px-4 py-2 text-left"
          >
            {locating
              ? <FiLoader className="text-amazon-yellow animate-spin text-sm flex-shrink-0" />
              : locationSaved
              ? <FiCheck className="text-green-400 text-sm flex-shrink-0" />
              : <FiMapPin className="text-amazon-yellow text-sm flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <span className="text-gray-400 text-xs">Deliver to </span>
              <span className="text-white text-xs font-bold">
                {locating ? 'Detecting location…' : deliveryCity}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); detectLocation() }}
                disabled={locating}
                className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors disabled:opacity-60"
              >
                {locating ? <FiLoader className="animate-spin text-xs" /> : <FiNavigation className="text-xs" />}
                {locating ? '…' : 'Use GPS'}
              </button>
              <FiChevronDown className={`text-gray-400 text-xs transition-transform flex-shrink-0 ${locationOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Mobile dropdown */}
          {locationOpen && (
            <div className="absolute top-full left-2 right-2 z-[60]">
              <LocationDropdown />
            </div>
          )}
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
