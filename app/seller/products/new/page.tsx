'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES } from '@/lib/utils'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { FiUpload, FiX } from 'react-icons/fi'

export default function NewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    discountPrice: '',
    discountPercent: '',
    category: '',
    subcategory: '',
    brand: '',
    stock: '',
    images: [''],
    tags: '',
    isDealOfDay: false,
    isFeatured: false,
  })

  useEffect(() => {
    if (user && user.role !== 'seller' && user.role !== 'admin') router.push('/')
  }, [user, router])

  if (!user || (user.role !== 'seller' && user.role !== 'admin')) return null

  function set(key: string, value: unknown) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function updateImage(i: number, val: string) {
    const imgs = [...form.images]
    imgs[i] = val
    setForm((p) => ({ ...p, images: imgs }))
  }

  function addImageField() {
    setForm((p) => ({ ...p, images: [...p.images, ''] }))
  }

  function removeImage(i: number) {
    setForm((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        const res = await axios.post('/api/upload', { image: base64, folder: 'primebazaar/products' })
        const url = res.data.url
        setForm((p) => ({
          ...p,
          images: [...p.images.filter((img) => img.trim()), url],
        }))
        toast.success('Image uploaded!')
      }
    } catch {
      toast.error('Upload failed. Check Cloudinary settings.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const price = parseFloat(form.price)
      const discountPrice = form.discountPrice ? parseFloat(form.discountPrice) : undefined
      const discountPercent = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : undefined

      await axios.post('/api/products', {
        ...form,
        price,
        discountPrice,
        discountPercent,
        stock: parseInt(form.stock),
        images: form.images.filter((img) => img.trim()),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success('Product created! Awaiting admin approval.')
      router.push('/seller/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create product'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = CATEGORIES.find((c) => c.name === form.category)

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Seller Dashboard', href: '/seller' },
        { label: 'Products', href: '/seller/products' },
        { label: 'Add New Product' },
      ]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required
              placeholder="Enter a clear, descriptive product title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} required rows={5}
              placeholder="Describe your product in detail..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <input value={form.brand} onChange={(e) => set('brand', e.target.value)} required placeholder="Brand name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="tag1, tag2, tag3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Category</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                  <option value="">Select subcategory</option>
                  {selectedCategory.subcategories.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Pricing & Inventory</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price ($) *</label>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} required min="0" step="0.01" placeholder="29.99"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price ($)</label>
              <input type="number" value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} min="0" step="0.01" placeholder="Optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
              <input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} required min="0" placeholder="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDealOfDay} onChange={(e) => set('isDealOfDay', e.target.checked)} className="accent-amazon-orange" />
              <span className="text-sm font-medium text-gray-700">Mark as Deal of the Day</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="accent-amazon-orange" />
              <span className="text-sm font-medium text-gray-700">Feature this product</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Product Images</h2>
            <span className="text-xs text-gray-400">{form.images.filter(i => i.trim()).length} image(s)</span>
          </div>

          {/* Upload from computer */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-violet-300 rounded-xl p-6 text-center cursor-pointer hover:bg-violet-50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <FiUpload className="text-3xl text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-violet-700">
              {uploading ? 'Uploading...' : 'Click to upload from computer'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — up to 10MB each</p>
          </div>

          {/* Image previews + URL inputs */}
          <div className="space-y-2">
            {form.images.map((img, i) => (
              <div key={i} className="flex gap-2 items-center">
                {img.trim() && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                <input
                  value={img}
                  onChange={(e) => updateImage(i, e.target.value)}
                  placeholder={`Image URL ${i + 1}`}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {form.images.length > 1 && (
                  <button type="button" onClick={() => removeImage(i)} className="text-red-400 hover:text-red-600 p-1">
                    <FiX />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addImageField} className="text-violet-600 text-sm hover:underline">
            + Add image URL manually
          </button>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm transition-colors">
            {saving ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
