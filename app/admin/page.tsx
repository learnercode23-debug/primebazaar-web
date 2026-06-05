'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiUsers, FiPackage, FiDollarSign, FiShoppingBag, FiTrendingUp, FiShield, FiCpu } from 'react-icons/fi'
// FiTrendingUp re-used for Order Tracking card

interface AdminAnalytics {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalSellers: number
  totalProducts: number
  recentOrders: Array<{ _id: string; createdAt: string; totalAmount: number; status: string; user: { name: string } }>
  monthlyRevenue: { month: string; revenue: number }[]
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [miningState, setMiningState] = useState<'idle' | 'running' | 'done'>('idle')
  const [miningResult, setMiningResult] = useState<{ rulesGenerated: number; rulesUpdated: number; totalOrdersProcessed: number; durationMs: number } | null>(null)

  async function runMining() {
    setMiningState('running')
    try {
      const res = await axios.post('/api/admin/analytics/mine-rules', { minSupport: 0.005, minConfidence: 0.02, minLift: 1.0, paidOnly: false })
      setMiningResult(res.data.data)
      setMiningState('done')
    } catch {
      setMiningState('idle')
      toast.error('Mining failed')
    }
  }

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    axios.get('/api/admin/analytics').then((r) => setAnalytics(r.data.data))
      .finally(() => setLoading(false))
  }, [user, router])

  if (!user || loading) return <LoadingSpinner fullPage />

  const stats = [
    { label: 'Total Revenue', value: formatPrice(analytics?.totalRevenue || 0), icon: FiDollarSign, color: 'text-green-600 bg-green-50', href: '/admin/orders' },
    { label: 'Total Orders', value: analytics?.totalOrders || 0, icon: FiShoppingBag, color: 'text-blue-600 bg-blue-50', href: '/admin/orders' },
    { label: 'Total Users', value: analytics?.totalUsers || 0, icon: FiUsers, color: 'text-purple-600 bg-purple-50', href: '/admin/users' },
    { label: 'Sellers', value: analytics?.totalSellers || 0, icon: FiTrendingUp, color: 'text-orange-600 bg-orange-50', href: '/admin/users?role=seller' },
    { label: 'Products', value: analytics?.totalProducts || 0, icon: FiPackage, color: 'text-teal-600 bg-teal-50', href: '/admin/products' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <FiShield className="text-amazon-orange text-2xl" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Platform overview and management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="text-lg" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      {/* Monthly revenue chart */}
      {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-2 h-40">
            {analytics.monthlyRevenue.map(({ month, revenue }) => {
              const max = Math.max(...analytics.monthlyRevenue.map((m) => m.revenue))
              const pct = max > 0 ? (revenue / max) * 100 : 0
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{formatPrice(revenue)}</span>
                  <div className="w-full bg-amazon-orange rounded-t" style={{ height: `${Math.max(pct, 2)}%` }} />
                  <span className="text-xs text-gray-400">{month.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: '/admin/products', label: 'Manage Products', desc: 'Approve, edit, or remove product listings', icon: FiPackage, color: 'bg-purple-50 border-purple-200' },
          { href: '/admin/users', label: 'Manage Users', desc: 'View and manage all customers and sellers', icon: FiUsers, color: 'bg-blue-50 border-blue-200' },
          { href: '/admin/orders', label: 'All Orders', desc: 'View and update all platform orders', icon: FiShoppingBag, color: 'bg-green-50 border-green-200' },
          { href: '/admin/categories', label: 'Categories', desc: 'Manage product category tree and commissions', icon: FiPackage, color: 'bg-yellow-50 border-yellow-200' },
          { href: '/admin/banners', label: 'Banners', desc: 'Manage homepage promotional banners', icon: FiShoppingBag, color: 'bg-pink-50 border-pink-200' },
          { href: '/admin/reviews', label: 'Review Moderation', desc: 'Approve and moderate customer reviews', icon: FiUsers, color: 'bg-red-50 border-red-200' },
          { href: '/admin/returns', label: 'Returns & Refunds', desc: 'Process return and refund requests', icon: FiShoppingBag, color: 'bg-orange-50 border-orange-200' },
          { href: '/admin/seller-banks', label: 'Seller Bank KYC', desc: 'Verify seller bank accounts for payouts', icon: FiDollarSign, color: 'bg-emerald-50 border-emerald-200' },
          { href: '/admin/payouts', label: 'Seller Payouts', desc: 'Run settlements and track COD cash', icon: FiDollarSign, color: 'bg-teal-50 border-teal-200' },
          { href: '/admin/assignments', label: 'Seller Assignments', desc: 'View, filter & reassign orders to sellers', icon: FiCpu, color: 'bg-indigo-50 border-indigo-200' },
          { href: '/admin/tracking', label: 'Order Tracking & SLA', desc: 'SLA timers, auto-reassign, seller performance scores', icon: FiTrendingUp, color: 'bg-rose-50 border-rose-200' },
          { href: '/admin/cod-collections', label: 'COD Collections', desc: 'Live delivery verifications, cash per agent, unlock codes', icon: FiTrendingUp, color: 'bg-green-50 border-green-200' },
          { href: '/admin/commission', label: 'Commission Tracking', desc: 'Earnings per product, seller, category + rule management', icon: FiDollarSign, color: 'bg-violet-50 border-violet-200' },
          { href: '/admin/support', label: 'Customer Support', desc: 'Help articles, ticket metrics, CSAT scores', icon: FiUsers, color: 'bg-cyan-50 border-cyan-200' },
          { href: '/agent', label: 'Agent Dashboard', desc: 'Handle support tickets and customer queries', icon: FiUsers, color: 'bg-sky-50 border-sky-200' },
        ].map(({ href, label, desc, icon: Icon, color }) => (
          <Link key={href} href={href} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${color}`}>
            <Icon className="text-2xl text-gray-700 mb-2" />
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Market Basket Analysis — Apriori engine */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FiCpu className="text-amazon-orange" /> Market Basket Analysis
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Apriori algorithm — mines association rules from order history to power &quot;Frequently Bought Together&quot;
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/api/seed/orders" target="_blank" className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors">
              Seed orders first
            </Link>
            <button
              onClick={runMining}
              disabled={miningState === 'running'}
              className="flex items-center gap-2 bg-amazon-orange hover:bg-orange-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-full text-sm transition-colors"
            >
              {miningState === 'running' ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mining…</>
              ) : (
                <><FiCpu /> Run Apriori Mining</>
              )}
            </button>
          </div>
        </div>

        {miningState === 'done' && miningResult && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Orders Processed', value: miningResult.totalOrdersProcessed.toLocaleString() },
              { label: 'New Rules', value: miningResult.rulesGenerated.toLocaleString(), color: 'text-green-600' },
              { label: 'Rules Updated', value: miningResult.rulesUpdated.toLocaleString(), color: 'text-blue-600' },
              { label: 'Mining Time', value: `${(miningResult.durationMs / 1000).toFixed(1)}s` },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-semibold mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Scans all paid orders to build transaction sets</li>
            <li>Counts 2-itemset co-occurrences with Apriori pruning</li>
            <li>Computes <strong>support</strong> (P(A∩B)), <strong>confidence</strong> (P(B|A)), and <strong>lift</strong> (conf/supp_B)</li>
            <li>Stores rules with lift &gt; 1.2 → displayed as &quot;Frequently Bought Together&quot; on product pages</li>
          </ol>
        </div>
      </div>

      {/* Recent orders */}
      {analytics?.recentOrders && analytics.recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {analytics.recentOrders.slice(0, 8).map((order) => (
              <div key={order._id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-mono font-medium text-gray-900">{order._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{order.user?.name || 'Unknown'} · {formatDate(order.createdAt)}</p>
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
