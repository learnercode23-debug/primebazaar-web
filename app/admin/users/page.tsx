'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import { formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { FiUserX, FiUserCheck } from 'react-icons/fi'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<(User & { isActive: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') { router.push('/'); return }
    const q = roleFilter !== 'all' ? `?role=${roleFilter}` : ''
    axios.get(`/api/admin/users${q}`).then((r) => setUsers(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user, router, roleFilter])

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
      setUsers((p) => p.map((u) => u._id === id ? { ...u, role: role as 'customer' | 'seller' | 'admin' } : u))
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (!user || loading) return <LoadingSpinner fullPage />

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      <div className="flex gap-2 mb-6">
        {[['all', 'All'], ['customer', 'Customers'], ['seller', 'Sellers'], ['admin', 'Admins']].map(([val, label]) => (
          <button key={val} onClick={() => setRoleFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              roleFilter === val ? 'bg-amazon-dark text-white' : 'border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Joined</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amazon-dark text-white flex items-center justify-center text-sm font-bold">
                        {u.name.charAt(0).toUpperCase()}
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
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
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
                        {u.isActive ? <><FiUserX /> Deactivate</> : <><FiUserCheck /> Activate</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="text-center py-12 text-gray-500">No users found</div>}
        </div>
      </div>
    </div>
  )
}
