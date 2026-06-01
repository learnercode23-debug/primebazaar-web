'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'

export default function SellerProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'seller' && user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/seller/products').then((r) => setProducts(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user, router])

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    try {
      await axios.delete(`/api/products/${id}`)
      setProducts((p) => p.filter((prod) => prod._id !== id))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Products ({products.length})</h1>
        <Link
          href="/seller/products/new"
          className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-4 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2"
        >
          <FiPlus /> Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold mb-2">No products yet</h2>
          <p className="text-gray-500 mb-6">Start adding products to your store.</p>
          <Link href="/seller/products/new" className="bg-amazon-yellow text-gray-900 font-bold px-6 py-2.5 rounded-full">
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Added</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-gray-50 rounded flex-shrink-0">
                          <Image src={product.images[0] || 'https://via.placeholder.com/100'} alt="" fill className="object-contain p-1" />
                        </div>
                        <div>
                          <Link href={`/products/${product._id}`} className="font-medium text-gray-900 hover:text-amazon-orange line-clamp-1 max-w-xs">
                            {product.title}
                          </Link>
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{typeof product.category === 'string' ? product.category : (product.category as { name: string }).name}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {product.discountPrice ? (
                        <div>
                          <span className="text-amazon-red">{formatPrice(product.discountPrice)}</span>
                          <span className="text-gray-400 line-through text-xs ml-1">{formatPrice(product.price)}</span>
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${product.stock === 0 ? 'text-red-600' : product.stock <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                      {product.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          <FiCheck /> Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          <FiX /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(product.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/seller/products/${product._id}/edit`}
                          className="p-1.5 text-gray-600 hover:text-amazon-orange hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          onClick={() => deleteProduct(product._id)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
