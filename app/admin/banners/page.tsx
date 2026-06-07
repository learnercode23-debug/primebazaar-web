'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi'

interface Banner {
  _id: string
  title: string
  subtitle?: string
  image: string
  link?: string
  buttonText?: string
  position: string
  order: number
  isActive: boolean
}

export default function AdminBannersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', link: '', buttonText: 'Shop Now', position: 'hero', order: '0', isActive: true })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingLink, setUploadingLink] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    loadBanners()
  }, [user, router])

  async function loadBanners() {
    const res = await axios.get('/api/admin/banners?active=false')
    setBanners(res.data.data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, order: parseInt(form.order) }
      if (editId) {
        await axios.put(`/api/admin/banners/${editId}`, payload)
        toast.success('Banner updated')
      } else {
        await axios.post('/api/admin/banners', payload)
        toast.success('Banner created')
      }
      setShowForm(false)
      setEditId(null)
      loadBanners()
    } catch {
      toast.error('Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await axios.put(`/api/admin/banners/${id}`, { isActive: !current })
    setBanners((p) => p.map((b) => b._id === id ? { ...b, isActive: !current } : b))
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return
    await axios.delete(`/api/admin/banners/${id}`)
    setBanners((p) => p.filter((b) => b._id !== id))
    toast.success('Banner deleted')
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string
        const res = await axios.post('/api/upload', { image: base64, folder: 'primebazaar/banners' })
        setForm((p) => ({ ...p, image: res.data.data.url }))
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Image upload failed')
      setUploading(false)
    }
  }

  async function handleLinkImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLink(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string
        const res = await axios.post('/api/upload', { image: base64, folder: 'primebazaar/banners' })
        setForm((p) => ({ ...p, link: res.data.data.url }))
        setUploadingLink(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Upload failed')
      setUploadingLink(false)
    }
  }

  function openEdit(b: Banner) {
    setForm({ title: b.title, subtitle: b.subtitle || '', image: b.image, link: b.link || '', buttonText: b.buttonText || 'Shop Now', position: b.position, order: String(b.order), isActive: b.isActive })
    setEditId(b._id)
    setShowForm(true)
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
        <button onClick={() => { setForm({ title: '', subtitle: '', image: '', link: '', buttonText: 'Shop Now', position: 'hero', order: '0', isActive: true }); setEditId(null); setShowForm(true) }}
          className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-1">
          <FiPlus /> New Banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Banner' : 'New Banner'}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input value={form.buttonText} onChange={(e) => setForm((p) => ({ ...p, buttonText: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
              <div className="flex gap-2 items-center mb-2">
                <label className={`cursor-pointer bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  {uploading ? 'Uploading...' : 'Upload from computer'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} disabled={uploading} />
                </label>
                <span className="text-xs text-gray-400">or paste a URL below</span>
              </div>
              {form.image && (
                <div className="mb-2 relative w-40 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={form.image} alt="preview" fill className="object-cover" />
                </div>
              )}
              <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} required placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
              <div className="flex gap-2 items-center mb-1">
                <label className={`cursor-pointer bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap ${uploadingLink ? 'opacity-60 pointer-events-none' : ''}`}>
                  {uploadingLink ? 'Uploading...' : 'Upload file'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLinkImageUpload} disabled={uploadingLink} />
                </label>
                <span className="text-xs text-gray-400">or type a path below</span>
              </div>
              <input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="/products?category=Electronics"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                <option value="hero">Hero (Homepage main)</option>
                <option value="promo_strip">Promo Strip</option>
                <option value="category_top">Category Top</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="accent-amazon-orange" id="banner-active" />
              <label htmlFor="banner-active" className="text-sm font-medium text-gray-700">Active</label>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-6 py-2 rounded-full text-sm disabled:opacity-70">
                {saving ? 'Saving...' : 'Save Banner'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {banners.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-500">No banners yet</div>
        ) : banners.map((banner) => (
          <div key={banner._id} className={`bg-white rounded-xl border-2 p-4 flex gap-4 items-center ${banner.isActive ? 'border-green-200' : 'border-gray-200 opacity-70'}`}>
            <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image src={banner.image} alt={banner.title} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{banner.title}</p>
              {banner.subtitle && <p className="text-sm text-gray-500 line-clamp-1">{banner.subtitle}</p>}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{banner.position.replace('_', ' ')}</span>
                <span className="text-xs text-gray-400">Order: {banner.order}</span>
                {banner.link && <span className="text-xs text-amazon-teal">{banner.link}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(banner._id, banner.isActive)}
                className={`text-xl ${banner.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                {banner.isActive ? <FiToggleRight /> : <FiToggleLeft />}
              </button>
              <button onClick={() => openEdit(banner)} className="p-2 text-gray-500 hover:text-amazon-orange hover:bg-orange-50 rounded transition-colors"><FiEdit2 /></button>
              <button onClick={() => deleteBanner(banner._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
