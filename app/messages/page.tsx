'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { FiMessageSquare, FiSearch, FiChevronRight, FiPackage } from 'react-icons/fi'

interface Conversation {
  _id: string
  customer: { _id: string; name: string; avatar?: string }
  seller:   { _id: string; name: string; avatar?: string }
  product?: { _id: string; title: string; images: string[] }
  lastMessage: string
  lastMessageAt: string
  lastSenderRole: 'customer' | 'seller'
  unreadByCustomer: number
  unreadBySeller: number
}

function Avatar({ name, src, size = 10 }: { name?: string; src?: string; size?: number }) {
  const letter = (name || '?').charAt(0).toUpperCase()
  const px = size * 4
  if (src) return <img src={src} alt={name || ''} style={{ width: px, height: px }} className="rounded-full object-cover flex-shrink-0" />
  return (
    <div style={{ width: px, height: px }} className="rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
      {letter}
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    axios.get('/api/messages').then(r => setConversations(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!user) return
    const t = setInterval(() => {
      axios.get('/api/messages').then(r => setConversations(r.data.data || [])).catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [user])

  if (authLoading || !user) return null

  const isSeller = user.role === 'seller' || user.role === 'admin'

  const filtered = conversations.filter(c => {
    const other = isSeller ? (c.customer?.name || '') : (c.seller?.name || '')
    const prod  = c.product?.title || ''
    return (other + prod + (c.lastMessage || '')).toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiMessageSquare className="text-5xl mx-auto mb-3"/>
          <p className="font-medium text-gray-600 mb-1">No messages yet</p>
          <p className="text-sm">
            {isSeller
              ? 'Customer messages will appear here'
              : 'Browse products and tap "Chat with Seller" to start a conversation'}
          </p>
          {!isSeller && (
            <Link href="/products" className="mt-4 inline-block bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              Browse Products
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(convo => {
            const other = (isSeller ? convo.customer : convo.seller) || { _id: '', name: 'Unknown', avatar: undefined }
            const unread = isSeller ? convo.unreadBySeller : convo.unreadByCustomer
            const lastIsMe = (isSeller && convo.lastSenderRole === 'seller') ||
                             (!isSeller && convo.lastSenderRole === 'customer')

            return (
              <Link key={convo._id} href={`/messages/${convo._id}`}
                className={`flex items-center gap-3 bg-white border rounded-2xl p-3.5 hover:shadow-md transition-all ${
                  unread > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                }`}>
                <Avatar name={other.name} src={other.avatar} size={12} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {other.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {timeAgo(convo.lastMessageAt)}
                    </span>
                  </div>
                  {convo.product && (
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 mb-0.5">
                      <FiPackage className="text-xs"/>
                      <span className="truncate max-w-[160px]">{convo.product.title}</span>
                    </div>
                  )}
                  <p className={`text-xs truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {lastIsMe ? 'You: ' : ''}{convo.lastMessage}
                  </p>
                </div>
                {unread > 0 ? (
                  <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : (
                  <FiChevronRight className="text-gray-400 flex-shrink-0"/>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
