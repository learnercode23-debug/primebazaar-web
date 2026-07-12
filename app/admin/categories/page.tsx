'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPlus, FiEdit2, FiTrash2, FiChevronRight } from 'react-icons/fi'
import { CATEGORIES } from '@/lib/utils'

interface Category {
  _id: string
  name: string
  slug: string
  icon?: string
  level: number
  isActive: boolean
  order: number
  parent?: { _id: string; name: string } | null
  commission: number
}

export default function AdminCategoriesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '', parent: '', commission: '10', order: '0', isActive: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    loadCategories()
  }, [user, router])

  async function loadCategories() {
    const res = await axios.get('/api/admin/categories')
    setCategories(res.data.data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        commission: parseFloat(form.commission),
        order: parseInt(form.order),
        parent: form.parent || null,
      }
      if (editId) {
        await axios.put(`/api/categories/${editId}`, payload)
        toast.success('Category updated')
      } else {
        await axios.post('/api/categories', payload)
        toast.success('Category created')
      }
      setShowForm(false)
      setEditId(null)
      loadCategories()
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return
    await axios.delete(`/api/categories/${id}`)
    toast.success('Category deleted')
    loadCategories()
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '', parent: cat.parent?._id || '', commission: String(cat.commission), order: String(cat.order), isActive: cat.isActive })
    setEditId(cat._id)
    setShowForm(true)
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  const rootCategories = categories.filter((c) => c.level === 0)
  const subCategories = categories.filter((c) => c.level > 0)

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
        <button onClick={() => { setForm({ name: '', slug: '', icon: '', parent: '', commission: '10', order: '0', isActive: true }); setEditId(null); setShowForm(true) }}
          className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-1 transition-colors">
          <FiPlus /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Category' : 'New Category'}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })) }} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
              <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="💻"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
              <select value={form.parent} onChange={(e) => setForm((p) => ({ ...p, parent: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange">
                <option value="">None (root)</option>
                {rootCategories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                {form.parent && !rootCategories.some((c) => c._id === form.parent) && (
                  <option value={form.parent}>{categories.find((c) => c._id === form.parent)?.name || 'Current parent'}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
              <input type="number" value={form.commission} onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))} min="0" max="50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-6 py-2 rounded-full text-sm disabled:opacity-70">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Parent</th>
              <th className="text-left px-4 py-3 font-semibold">Slug</th>
              <th className="text-center px-4 py-3 font-semibold">Commission</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-center px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <tr key={cat._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {cat.level > 0 && <FiChevronRight className="text-gray-400 text-xs ml-4" />}
                    {cat.icon && <span>{cat.icon}</span>}
                    <span className="font-medium">{cat.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{cat.parent?.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                <td className="px-4 py-3 text-center">{cat.commission}%</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-500 hover:text-amazon-orange hover:bg-orange-50 rounded transition-colors"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(cat._id, cat.name)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && <div className="py-12 text-center text-gray-500">No categories yet</div>}
      </div>
    </div>
  )
}
