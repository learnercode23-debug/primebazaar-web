'use client'

import Link from 'next/link'
import { FiFacebook, FiTwitter, FiInstagram, FiYoutube } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="bg-amazon-dark text-white mt-auto">
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-amazon-light hover:bg-amazon-blue py-3 text-sm text-center transition-colors"
      >
        Back to top
      </button>

      {/* Main footer links */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-sm mb-3">Get to Know Us</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/about" className="hover:text-white hover:underline transition-colors">About Primepasal</Link></li>
            <li><Link href="/about" className="hover:text-white hover:underline transition-colors">Careers</Link></li>
            <li><Link href="/about" className="hover:text-white hover:underline transition-colors">Press Releases</Link></li>
            <li><Link href="/about" className="hover:text-white hover:underline transition-colors">Investor Relations</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3">Make Money with Us</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/register?role=seller" className="hover:text-white hover:underline transition-colors">Sell on Primepasal</Link></li>
            <li><Link href="/register?role=seller" className="hover:text-white hover:underline transition-colors">Become an Affiliate</Link></li>
            <li><Link href="/register?role=seller" className="hover:text-white hover:underline transition-colors">Advertise Your Products</Link></li>
            <li><Link href="/register?role=seller" className="hover:text-white hover:underline transition-colors">Sell Apps on Primepasal</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3">Let Us Help You</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/profile" className="hover:text-white hover:underline transition-colors">Your Account</Link></li>
            <li><Link href="/orders" className="hover:text-white hover:underline transition-colors">Your Orders</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline transition-colors">Shipping Rates & Policies</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline transition-colors">Returns & Replacements</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline transition-colors">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3">Shop by Department</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/products?category=Electronics" className="hover:text-white hover:underline transition-colors">Electronics</Link></li>
            <li><Link href="/products?category=Fashion" className="hover:text-white hover:underline transition-colors">Fashion</Link></li>
            <li><Link href="/products?category=Home+%26+Garden" className="hover:text-white hover:underline transition-colors">Home & Garden</Link></li>
            <li><Link href="/products?category=Books" className="hover:text-white hover:underline transition-colors">Books</Link></li>
            <li><Link href="/products?category=Sports" className="hover:text-white hover:underline transition-colors">Sports</Link></li>
          </ul>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* Bottom footer */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <img src="/brand/logo.png" alt="PrimePasal" className="h-8 w-auto brightness-0 invert"
            onError={(e) => { (e.target as HTMLImageElement).src = '/brand/logo.svg' }} />
        </div>
        <div className="flex gap-4">
          <a href="https://www.facebook.com/profile.php?id=61590464048675" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><FiFacebook className="text-xl" /></a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiTwitter className="text-xl" /></a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiInstagram className="text-xl" /></a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors"><FiYoutube className="text-xl" /></a>
        </div>
        <div className="text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Primepasal. All rights reserved.{' '}
          <Link href="/privacy" className="hover:text-white hover:underline transition-colors">Privacy</Link> ·{' '}
          <Link href="/terms" className="hover:text-white hover:underline transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
