'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiSave,
  FiPackage, FiHeart, FiShield, FiDollarSign, FiEdit2, FiX, FiLock, FiEye, FiEyeOff,
} from 'react-icons/fi'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading, updateUser, logout } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'Nepal' },
  })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Sync form whenever user data changes (on load + after save)
  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    setForm({
      name:  user.name  || '',
      phone: user.phone || '',
      address: {
        street:  (user as unknown as { address?: { street?: string } }).address?.street  || '',
        city:    (user as unknown as { address?: { city?: string } }).address?.city    || '',
        state:   (user as unknown as { address?: { state?: string } }).address?.state   || '',
        zipCode: (user as unknown as { address?: { zipCode?: string } }).address?.zipCode || '',
        country: (user as unknown as { address?: { country?: string } }).address?.country || 'Nepal',
      },
    })
  }, [user, loading, router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-amazon-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await axios.put('/api/auth/profile', form)
      updateUser(res.data.data)
      setEditing(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      await axios.put('/api/auth/profile', { currentPassword: pwForm.current, newPassword: pwForm.next })
      toast.success('Password changed successfully!')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  function handleCancel() {
    // Reset form to current saved values
    setForm({
      name:  user!.name  || '',
      phone: user!.phone || '',
      address: {
        street:  (user as unknown as { address?: { street?: string } }).address?.street  || '',
        city:    (user as unknown as { address?: { city?: string } }).address?.city    || '',
        state:   (user as unknown as { address?: { state?: string } }).address?.state   || '',
        zipCode: (user as unknown as { address?: { zipCode?: string } }).address?.zipCode || '',
        country: (user as unknown as { address?: { country?: string } }).address?.country || 'Nepal',
      },
    })
    setEditing(false)
  }

  const addr = (user as unknown as { address?: Record<string, string> }).address

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">

        {/* ── Sidebar ── */}
        <div className="sm:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amazon-dark text-white flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900">{user.name || 'My Account'}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              <p className="text-xs text-gray-400 mt-1">Member since {formatDate(user.createdAt)}</p>
            </div>
            <nav className="space-y-1">
              {[
                { href: '/orders',  icon: FiPackage,    label: 'My Orders' },
                { href: '/wishlist',icon: FiHeart,      label: 'Wishlist' },
                { href: '/support', icon: FiMapPin,     label: 'Help & Support' },
                ...(user.role === 'seller' ? [
                  { href: '/seller',          icon: FiShield,    label: 'Seller Hub' },
                  { href: '/seller/earnings', icon: FiDollarSign,label: 'Earnings & Payouts' },
                ] : []),
                ...(user.role === 'admin' ? [
                  { href: '/admin',          icon: FiShield,    label: 'Admin Dashboard' },
                  { href: '/admin/payouts',  icon: FiDollarSign,label: 'Seller Payouts' },
                ] : []),
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Icon className="text-gray-400" /> {label}
                </Link>
              ))}
              <button onClick={async () => { await logout(); router.push('/') }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
                Sign Out
              </button>
            </nav>
          </div>
        </div>

        {/* ── Profile card ── */}
        <div className="sm:col-span-3 space-y-4">

          {/* ── VIEW MODE ── */}
          {!editing && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">Personal Information</h2>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-full transition-colors">
                  <FiEdit2 className="text-sm" /> Edit Profile
                </button>
              </div>

              {/* Info rows */}
              <div className="space-y-4">
                <InfoRow icon={<FiUser className="text-gray-400"/>}  label="Full Name" value={user.name} />
                <InfoRow icon={<FiMail className="text-gray-400"/>}  label="Email"     value={user.email} />
                <InfoRow icon={<FiPhone className="text-gray-400"/>} label="Phone"     value={user.phone || '—'} />
              </div>

              {/* Address */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1 mb-3">
                  <FiMapPin className="text-gray-400"/> Default Address
                </p>
                {addr?.street ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-0.5">
                    <p>{addr.street}</p>
                    <p>{[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}</p>
                    <p>{addr.country}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">
                    No address saved — click <strong>Edit Profile</strong> to add one.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHANGE PASSWORD ── */}
          {!editing && (
            <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FiLock className="text-gray-400" /> Change Password
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400">
                      {showPw ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.next}
                    onChange={(e) => setPwForm(p => ({ ...p, next: e.target.value }))}
                    required minLength={8} placeholder="Min 8 characters"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    required minLength={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                  />
                </div>
              </div>
              <button type="submit" disabled={pwSaving}
                className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 transition-colors">
                <FiLock /> {pwSaving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* ── EDIT MODE ── */}
          {editing && (
            <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Edit Profile</h2>
                <button type="button" onClick={handleCancel}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <FiX /> Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (read-only)</label>
                  <input value={user.email} readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="98XXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                  />
                </div>
              </div>

              {/* Address fields */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1 text-sm">
                  <FiMapPin className="text-gray-400"/> Default Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input value={form.address.street}
                      onChange={(e) => setForm(p => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                      placeholder="Thamel, Kathmandu"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                    />
                  </div>
                  {[
                    { key: 'city',    label: 'City',     placeholder: 'Kathmandu' },
                    { key: 'state',   label: 'Province', placeholder: 'Bagmati' },
                    { key: 'zipCode', label: 'ZIP Code', placeholder: '44600' },
                    { key: 'country', label: 'Country',  placeholder: 'Nepal' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        value={form.address[key as keyof typeof form.address]}
                        onChange={(e) => setForm(p => ({ ...p, address: { ...p.address, [key]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 transition-colors">
                  <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Helper component ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
