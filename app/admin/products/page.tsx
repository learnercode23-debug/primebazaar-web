'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiCheck, FiX, FiTrash2 } from 'react-icons/fi'

export default function AdminProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    loadProducts()
  }, [user, router])

  async function loadProducts() {
    const query = filter === 'pending' ? '?approved=false' : filter === 'approved' ? '?approved=true' : ''
    const res = await axios.get(`/api/admin/products${query}`)
    setProducts(res.data.data || [])
    setLoading(false)
  }

  async function approve(id: string) {
    await axios.put(`/api/admin/products/${id}`, { isApproved: true })
    setProducts((p) => p.map((prod) => prod._id === id ? { ...prod, isApproved: true } : prod))
    toast.success('Product approved!')
  }

  async function unapprove(id: string) {
    await axios.put(`/api/admin/products/${id}`, { isApproved: false })
    setProducts((p) => p.map((prod) => prod._id === id ? { ...prod, isApproved: false } : prod))
    toast.success('Product unapproved')
  }

  async function remove(id: string) {
    if (!confirm('Delete this product permanently?')) return
    await axios.delete(`/api/admin/products/${id}`)
    setProducts((p) => p.filter((prod) => prod._id !== id))
    toast.success('Product deleted')
  }

  const filtered = filter === 'pending'
    ? products.filter((p) => !p.isApproved)
    : filter === 'approved'
    ? products.filter((p) => p.isApproved)
    : products

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Management</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-amazon-dark text-white' : 'border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}>
            {f === 'pending' ? `⏳ Pending (${products.filter(p => !p.isApproved).length})` :
             f === 'approved' ? `✅ Approved (${products.filter(p => p.isApproved).length})` :
             `All (${products.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Seller</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Stock</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Added</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => {
                const seller = product.seller as { name?: string }
                return (
                  <tr key={product._id} className={`hover:bg-gray-50 transition-colors ${!product.isApproved ? 'bg-yellow-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-gray-50 rounded flex-shrink-0">
                          <Image src={product.images[0] || 'https://via.placeholder.com/100'} alt="" fill className="object-contain p-1" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{seller?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-600">{typeof product.category === 'string' ? product.category : (product.category as { name: string }).name}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(product.discountPrice || product.price)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${product.stock === 0 ? 'text-red-600' : 'text-green-600'}`}>{product.stock}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(product.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {!product.isApproved ? (
                          <button onClick={() => approve(product._id)}
                            className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1.5 rounded-full font-medium transition-colors">
                            <FiCheck /> Approve
                          </button>
                        ) : (
                          <button onClick={() => unapprove(product._id)}
                            className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-2.5 py-1.5 rounded-full font-medium transition-colors">
                            <FiX /> Unpublish
                          </button>
                        )}
                        <button onClick={() => remove(product._id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">No products found</div>
          )}
        </div>
      </div>
    </div>
  )
}
