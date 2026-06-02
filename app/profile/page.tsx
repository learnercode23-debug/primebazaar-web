'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiPackage, FiHeart, FiShield, FiDollarSign } from 'react-icons/fi'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || 'US',
    },
  })

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  if (!user) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await axios.put('/api/auth/profile', form)
      updateUser(res.data.data)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="sm:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amazon-dark text-white flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              <p className="text-xs text-gray-400 mt-1">Member since {formatDate(user.createdAt)}</p>
            </div>
            <nav className="space-y-1">
              {[
                { href: '/orders', icon: FiPackage, label: 'My Orders' },
                { href: '/wishlist', icon: FiHeart, label: 'Wishlist' },
                ...(user.role !== 'customer' ? [
                  { href: '/seller', icon: FiShield, label: 'Seller Hub' },
                  { href: '/seller/earnings', icon: FiDollarSign, label: 'Earnings & Payouts' },
                ] : []),
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Icon className="text-gray-400" /> {label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>

        {/* Profile form */}
        <div className="sm:col-span-3">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <FiUser className="text-gray-400" /> Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <FiMail className="text-gray-400" /> Email (read-only)
                </label>
                <input
                  value={user.email}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <FiPhone className="text-gray-400" /> Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1">
                <FiMapPin className="text-gray-400" /> Default Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                  <input
                    value={form.address.street}
                    onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                    placeholder="123 Main St"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                  />
                </div>
                {[
                  { key: 'city', label: 'City', placeholder: 'New York' },
                  { key: 'state', label: 'State', placeholder: 'NY' },
                  { key: 'zipCode', label: 'ZIP Code', placeholder: '10001' },
                  { key: 'country', label: 'Country', placeholder: 'US' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      value={form.address[key as keyof typeof form.address]}
                      onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, [key]: e.target.value } }))}
                      placeholder={placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
