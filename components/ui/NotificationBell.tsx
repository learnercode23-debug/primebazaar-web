'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { FiBell, FiX } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'

interface Notification {
  _id: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
  type: string
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    axios.get('/api/notifications?limit=10').then((r) => {
      setNotifications(r.data.data || [])
      setUnreadCount(r.data.unreadCount || 0)
    })
  }, [user])

  useEffect(() => {
    function click(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  async function markAllRead() {
    await axios.put('/api/notifications', { markAllRead: true })
    setNotifications((p) => p.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-white hover:ring-1 hover:ring-white rounded p-1.5 transition-colors"
      >
        <FiBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-amazon-teal hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <FiX />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  onClick={async () => {
                    if (!n.isRead) {
                      await axios.put('/api/notifications', { notificationId: n._id })
                      setNotifications((p) => p.map((x) => x._id === n._id ? { ...x, isRead: true } : x))
                      setUnreadCount((c) => Math.max(0, c - 1))
                    }
                    setOpen(false)
                  }}
                >
                  {n.link ? (
                    <Link href={n.link} className="block">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                    </>
                  )}
                  {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-4 top-1/2 -translate-y-1/2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
