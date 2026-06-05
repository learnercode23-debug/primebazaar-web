'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import nextDynamic from 'next/dynamic'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiMapPin, FiPlus, FiEdit2, FiTrash2, FiCheck, FiNavigation } from 'react-icons/fi'

// Lazy load map (Leaflet requires browser APIs, can't SSR)
const MapLocationPicker = nextDynamic(
  () => import('@/components/ui/MapLocationPicker'),
  { ssr: false, loading: () => <LoadingSpinner fullPage /> }
)

interface Address {
  _id: string
  label: string
  isDefault: boolean
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
}

const emptyForm = {
  label: 'Home',
  name: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'NP',
  phone: '',
  isDefault: false,
}

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    axios.get('/api/addresses').then((r) => setAddresses(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openAddWithMap() { setShowMap(true) }

  function openEdit(addr: Address) {
    setForm({
      label: addr.label,
      name: addr.name,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      phone: addr.phone,
      isDefault: addr.isDefault,
    })
    setEditId(addr._id)
    setShowForm(true)
  }

  // Called when user confirms a location on the map
  function handleMapConfirm(location: {
    lat: number; lng: number
    address: string; city: string; state: string
    zipCode: string; country: string; displayName: string
  }) {
    setShowMap(false)
    setForm({
      ...emptyForm,
      street: location.address,
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
      country: location.country || 'NP',
    })
    setEditId(null)
    setShowForm(true)
    toast.success('Location detected! Fill in the remaining details.')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        const res = await axios.put('/api/addresses', { addressId: editId, ...form })
        setAddresses(res.data.data)
        toast.success('Address updated')
      } else {
        const res = await axios.post('/api/addresses', form)
        setAddresses(res.data.data)
        toast.success('Address added')
      }
      setShowForm(false)
    } catch {
      toast.error('Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this address?')) return
    const res = await axios.delete('/api/addresses', { data: { addressId: id } })
    setAddresses(res.data.data)
    toast.success('Address deleted')
  }

  async function setDefault(id: string) {
    const res = await axios.put('/api/addresses', { addressId: id, isDefault: true })
    setAddresses(res.data.data)
    toast.success('Default address updated')
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  // ── Map overlay ──────────────────────────────────────────────────────────
  if (showMap) {
    return (
      <MapLocationPicker
        onConfirm={handleMapConfirm}
        onClose={() => setShowMap(false)}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiMapPin className="text-brand-600" /> My Addresses
        </h1>

        {/* Add via map OR manually */}
        <div className="flex gap-2">
          <button
            onClick={openAddWithMap}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-colors shadow-sm"
          >
            <FiNavigation className="text-sm" /> Pick on Map
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2.5 rounded-full text-sm transition-colors"
          >
            <FiPlus /> Add Manually
          </button>
        </div>
      </div>

      {/* ── Address Form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Address' : 'New Address'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                <select
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                >
                  {['Home', 'Work', 'Other'].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Hari Sharma"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Street / Area *</label>
              <input
                value={form.street}
                onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
                required
                placeholder="Chabahil-4, New Baneshwor"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                style={{ fontSize: 16 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  required
                  placeholder="Kathmandu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Province</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="Bagmati"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ZIP Code</label>
                <input
                  value={form.zipCode}
                  onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
                  placeholder="44600"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  required
                  placeholder="+977-98XXXXXXXX"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                className="accent-brand-600 w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Set as default delivery address</span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-70 text-white font-bold py-3 rounded-full text-sm transition-colors"
              >
                {saving ? 'Saving…' : editId ? 'Update Address' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 px-5 py-3 rounded-full text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Empty state ── */}
      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMapPin className="text-4xl text-brand-400" />
          </div>
          <h2 className="text-lg font-bold mb-1 text-gray-900">No saved addresses</h2>
          <p className="text-sm text-gray-400 mb-6">Add your first address to speed up checkout</p>
          <button
            onClick={openAddWithMap}
            className="bg-brand-600 text-white font-bold px-6 py-3 rounded-full text-sm hover:bg-brand-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <FiNavigation /> Pick location on map
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`bg-white rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                addr.isDefault ? 'border-brand-400 shadow-purple' : 'border-gray-100 hover:border-brand-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    addr.isDefault ? 'bg-brand-600' : 'bg-gray-100'
                  }`}>
                    <FiMapPin className={`text-lg ${addr.isDefault ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FiCheck className="text-xs" /> Default
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-gray-900">{addr.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{addr.street}</p>
                    <p className="text-xs text-gray-500">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zipCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefault(addr._id)}
                      className="text-xs text-brand-600 hover:underline px-2 py-1 rounded-lg hover:bg-brand-50 hidden sm:block"
                    >
                      Set default
                    </button>
                  )}
                  <button onClick={() => openEdit(addr)} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                    <FiEdit2 className="text-sm" />
                  </button>
                  <button onClick={() => handleDelete(addr._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>

              {!addr.isDefault && (
                <button
                  onClick={() => setDefault(addr._id)}
                  className="mt-3 text-xs text-brand-600 hover:underline sm:hidden"
                >
                  Set as default →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
