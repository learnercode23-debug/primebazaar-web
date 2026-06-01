'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Breadcrumb from '@/components/ui/Breadcrumb'

export default function EditProductPage() {
  const { id } = useParams() as { id: string }
  const { user } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', price: '', discountPrice: '',
    category: '', subcategory: '', brand: '', stock: '',
    images: [''], tags: '', isDealOfDay: false, isFeatured: false,
  })

  useEffect(() => {
    axios.get(`/api/products/${id}`).then((r) => {
      const p = r.data.data
      setForm({
        title: p.title, description: p.description,
        price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : '',
        category: p.category, subcategory: p.subcategory || '',
        brand: p.brand, stock: String(p.stock),
        images: p.images.length ? p.images : [''],
        tags: p.tags.join(', '), isDealOfDay: p.isDealOfDay, isFeatured: p.isFeatured,
      })
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner fullPage />
  if (!user || (user.role !== 'seller' && user.role !== 'admin')) { router.push('/'); return null }

  function set(key: string, value: unknown) { setForm((p) => ({ ...p, [key]: value })) }
  function updateImage(i: number, val: string) {
    const imgs = [...form.images]; imgs[i] = val
    setForm((p) => ({ ...p, images: imgs }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const price = parseFloat(form.price)
      const discountPrice = form.discountPrice ? parseFloat(form.discountPrice) : undefined
      const discountPercent = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : undefined
      await axios.put(`/api/products/${id}`, {
        ...form, price, discountPrice, discountPercent,
        stock: parseInt(form.stock),
        images: form.images.filter((img) => img.trim()),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success('Product updated!')
      router.push('/seller/products')
    } catch {
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = CATEGORIES.find((c) => c.name === form.category)

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <Breadcrumb items={[
        { label: 'Seller Dashboard', href: '/seller' },
        { label: 'Products', href: '/seller/products' },
        { label: 'Edit Product' },
      ]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} required rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <input value={form.brand} onChange={(e) => set('brand', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="tag1, tag2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Category</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                  <option value="">Select</option>
                  {selectedCategory.subcategories.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Pricing & Stock</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} required min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price ($)</label>
              <input type="number" value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} required min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDealOfDay} onChange={(e) => set('isDealOfDay', e.target.checked)} className="accent-amazon-orange" />
              <span className="text-sm">Deal of the Day</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="accent-amazon-orange" />
              <span className="text-sm">Featured</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Images</h2>
          {form.images.map((img, i) => (
            <input key={i} value={img} onChange={(e) => updateImage(i, e.target.value)} placeholder={`Image URL ${i + 1}`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
          ))}
          <button type="button" onClick={() => setForm((p) => ({ ...p, images: [...p.images, ''] }))} className="text-amazon-teal text-sm hover:underline">
            + Add image
          </button>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-70 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
