'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import { formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiUserX, FiUserCheck, FiRefreshCw } from 'react-icons/fi'

type AdminUser = User & { isActive: boolean; lastSeen?: string }

const ONLINE_WINDOW_MS = 5 * 60 * 1000   // "active now" = seen in the last 5 minutes

function isOnline(lastSeen?: string) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS
}

function lastSeenText(lastSeen?: string) {
  if (!lastSeen) return 'Never'
  const diff = Date.now() - new Date(lastSeen).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const days = Math.floor(hr / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')
  const [onlineOnly, setOnlineOnly] = useState(false)

  const fetchUsers = useCallback(async () => {
    const q = roleFilter !== 'all' ? `?role=${roleFilter}` : ''
    try {
      const r = await axios.get(`/api/admin/users${q}`)
      setUsers(r.data.data || [])
    } catch { /* keep previous list on a failed refresh */ }
    finally { setLoading(false) }
  }, [roleFilter])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    fetchUsers()
    // Auto-refresh so "active now" stays live
    const t = setInterval(fetchUsers, 30000)
    return () => clearInterval(t)
  }, [user, router, fetchUsers])

  async function toggleActive(id: string, isActive: boolean) {
    try {
      if (isActive) {
        await axios.delete(`/api/admin/users/${id}`)
      } else {
        await axios.put(`/api/admin/users/${id}`, { isActive: true })
      }
      setUsers((p) => p.map((u) => u._id === id ? { ...u, isActive: !isActive } : u))
      toast.success(isActive ? 'User deactivated' : 'User activated')
    } catch {
      toast.error('Failed to update user')
    }
  }

  async function changeRole(id: string, role: string) {
    try {
      await axios.put(`/api/admin/users/${id}`, { role })
      setUsers((p) => p.map((u) => u._id === id ? { ...u, role: role as 'customer' | 'seller' | 'admin' | 'delivery' } : u))
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  const onlineCount = users.filter((u) => isOnline(u.lastSeen)).length
  const shown = onlineOnly ? users.filter((u) => isOnline(u.lastSeen)) : users

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            {onlineCount} active now
          </span>
          <button onClick={fetchUsers} title="Refresh" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FiRefreshCw className="text-gray-500 text-sm" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {[['all', 'All'], ['customer', 'Customers'], ['seller', 'Sellers'], ['delivery', 'Delivery Agents'], ['admin', 'Admins']].map(([val, label]) => (
          <button key={val} onClick={() => setRoleFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              roleFilter === val ? 'bg-amazon-dark text-white' : 'border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}>
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="w-4 h-4 accent-green-600" />
          Active now only
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Active now</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Joined</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Account</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((u) => {
                const online = isOnline(u.lastSeen)
                return (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-amazon-dark text-white flex items-center justify-center text-sm font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" title="Active now" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amazon-orange capitalize"
                      >
                        <option value="customer">Customer</option>
                        <option value="seller">Seller</option>
                        <option value="delivery">Delivery Agent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {online ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                          Active now
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{lastSeenText(u.lastSeen)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u._id !== user._id && (
                        <button
                          onClick={() => toggleActive(u._id, u.isActive)}
                          className={`flex items-center gap-1 mx-auto text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${
                            u.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {u.isActive ? <><FiUserX /> Disable</> : <><FiUserCheck /> Enable</>}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div className="text-center py-12 text-gray-500">{onlineOnly ? 'No users active right now' : 'No users found'}</div>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        &ldquo;Active now&rdquo; = signed-in users seen in the last 5 minutes. List auto-refreshes every 30 seconds.
      </p>
    </div>
  )
}
