'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiPackage, FiDollarSign, FiShoppingBag, FiTrendingUp, FiPlus, FiMessageSquare, FiStar, FiCreditCard, FiTruck } from 'react-icons/fi'

interface Analytics {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  recentOrders: Array<{ _id: string; createdAt: string; totalAmount: number; status: string; items: Array<{ title: string; quantity: number; price: number }> }>
  monthlyRevenue: { month: string; revenue: number }[]
}

export default function SellerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'seller' && user.role !== 'admin') {
      router.push('/')
      return
    }
    axios.get('/api/seller/analytics').then((r) => setAnalytics(r.data.data))
      .finally(() => setLoading(false))
  }, [user, router])

  if (!user || loading) return <LoadingSpinner fullPage />

  const stats = [
    { label: 'Total Revenue', value: formatPrice(analytics?.totalRevenue || 0), icon: FiDollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Total Orders', value: analytics?.totalOrders || 0, icon: FiShoppingBag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Products', value: analytics?.totalProducts || 0, icon: FiPackage, color: 'text-purple-600 bg-purple-50' },
    { label: 'Avg. Order Value', value: analytics?.totalOrders ? formatPrice((analytics?.totalRevenue || 0) / analytics.totalOrders) : '$0', icon: FiTrendingUp, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {user.name}</p>
        </div>
        <Link href="/seller/deliveries"
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2">
          📸 Delivery Proofs
        </Link>
        <Link
          href="/seller/products/new"
          className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-4 py-2.5 rounded-full text-sm transition-colors flex items-center gap-2"
        >
          <FiPlus /> Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="text-lg" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly revenue */}
      {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-2 h-32">
            {analytics.monthlyRevenue.map(({ month, revenue }) => {
              const max = Math.max(...analytics.monthlyRevenue.map((m) => m.revenue))
              const pct = max > 0 ? (revenue / max) * 100 : 0
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{formatPrice(revenue)}</span>
                  <div
                    className="w-full bg-amazon-orange rounded-t transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-xs text-gray-400">{month.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/seller/products',  label: 'My Products',        desc: 'Add, edit, or remove your listings',         icon: FiPackage,     color: 'bg-purple-50 border-purple-200' },
          { href: '/seller/orders',    label: 'Orders',             desc: 'Accept, pack and ship customer orders',      icon: FiShoppingBag, color: 'bg-blue-50 border-blue-200' },
          { href: '/seller/earnings',  label: 'Earnings & Payouts', desc: 'Wallet balance, ledger, bank accounts',      icon: FiDollarSign,  color: 'bg-green-50 border-green-200' },
          { href: '/seller/cod-orders',label: 'COD Orders',         desc: 'Track cash-on-delivery collections',         icon: FiCreditCard,  color: 'bg-amber-50 border-amber-200' },
          { href: '/seller/deliveries',label: 'Delivery Proofs',    desc: 'View and dispute delivery photo proofs',     icon: FiTruck,       color: 'bg-orange-50 border-orange-200' },
          { href: '/seller/reviews',   label: 'Customer Reviews',   desc: 'See what buyers say about your products',    icon: FiStar,        color: 'bg-yellow-50 border-yellow-200' },
          { href: '/messages',         label: 'Messages',           desc: 'Chat with customers about your products',    icon: FiMessageSquare, color: 'bg-indigo-50 border-indigo-200' },
          { href: '/support',          label: 'Help & Support',     desc: 'Submit a ticket or browse help articles',    icon: FiPackage,     color: 'bg-teal-50 border-teal-200' },
          { href: '/profile',          label: 'My Profile',         desc: 'Update account info and password',           icon: FiTrendingUp,  color: 'bg-gray-50 border-gray-200' },
        ].map(({ href, label, desc, icon: Icon, color }) => (
          <Link key={href} href={href} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${color}`}>
            <Icon className="text-2xl text-gray-700 mb-2" />
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {analytics?.recentOrders && analytics.recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link href="/seller/orders" className="text-amazon-teal text-sm hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {analytics.recentOrders.slice(0, 5).map((order) => (
              <div key={order._id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900 font-mono">{order._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(order.totalAmount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
