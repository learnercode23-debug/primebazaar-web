'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiSend, FiPackage, FiMessageSquare, FiX } from 'react-icons/fi'

interface Message {
  _id: string
  sender?: { _id: string; name: string }
  senderRole: 'customer' | 'seller' | 'bot'
  body: string
  read: boolean
  createdAt: string
}
interface Conversation {
  _id: string
  customer: { _id: string; name: string; avatar?: string }
  seller:   { _id: string; name: string; avatar?: string }
  product?: { _id: string; title: string; images: string[]; price: number }
  order?:   { _id: string; orderNumber: string; createdAt: string; items: { title: string; image: string }[] }
}

const QUICK_REPLIES_SELLER = [
  'Hi! Thanks for your message. How can I help you?',
  'Yes, this item is available!',
  'We offer free shipping on this product.',
  'Delivery takes 2-4 business days in Kathmandu Valley.',
  'Please send me your order number and I\'ll check it.',
  'I\'ll get back to you shortly!',
]
const QUICK_REPLIES_CUSTOMER = [
  'Is this item available?',
  'What are the payment options?',
  'How long does delivery take?',
  'Do you offer a warranty?',
  'Can I get a discount for bulk order?',
  'Can you send more photos?',
]

function Avatar({ name, src }: { name?: string; src?: string }) {
  const letter = (name || '?').charAt(0).toUpperCase()
  if (src) return <img src={src} alt={name || ''} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
      {letter}
    </div>
  )
}

export default function ChatRoom() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [convo, setConvo]       = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [typing, setTyping]     = useState(false)
  const [showOrderCard, setShowOrderCard] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const loadConvo = useCallback(async () => {
    try {
      const r = await axios.get(`/api/messages/${id}`)
      setConvo(r.data.data.conversation)
      setMessages(r.data.data.messages || [])
    } catch {
      router.push('/messages')
    }
  }, [id, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    loadConvo().finally(() => setLoading(false))
  }, [user, authLoading, loadConvo])

  // Poll every 5 seconds for new messages
  useEffect(() => {
    if (!user || loading) return
    const interval = setInterval(async () => {
      try {
        const r = await axios.get(`/api/messages/${id}`)
        setMessages(r.data.data.messages || [])
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [id, user, loading])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isSeller = user && convo &&
    (user._id === convo.seller._id || user.role === 'admin')

  async function sendMessage() {
    if (!text.trim() || sending) return
    const body = text.trim()
    setText('')
    setSending(true)
    setTyping(true)

    // Optimistic add
    const temp: Message = {
      _id: 'temp-' + Date.now(),
      senderRole: isSeller ? 'seller' : 'customer',
      body,
      read: false,
      createdAt: new Date().toISOString(),
    }
    setMessages(p => [...p, temp])

    try {
      const r = await axios.post(`/api/messages/${id}`, { body })
      setMessages(p => p.some(m => m._id === r.data.data._id)
        ? p.filter(m => m._id !== temp._id)
        : [...p.filter(m => m._id !== temp._id), r.data.data])
    } catch {
      setMessages(p => p.filter(m => m._id !== temp._id))
      toast.error('Failed to send')
      setText(body)
    } finally {
      setSending(false)
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  function applyQuickReply(reply: string) {
    setText(reply)
    inputRef.current?.focus()
  }

  if (authLoading || !user || loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!convo) return null

  const other = (isSeller ? convo.customer : convo.seller) || { _id: '', name: 'Unknown', avatar: undefined }
  const quickReplies = isSeller ? QUICK_REPLIES_SELLER : QUICK_REPLIES_CUSTOMER

  return (
    <div className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-4 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-3 sm:px-0 py-3 border-b bg-white sm:rounded-t-2xl sm:border sm:border-b-0 sm:border-gray-200 flex-shrink-0">
        <button onClick={() => router.push('/messages')} className="text-gray-500 hover:text-gray-700">
          <FiArrowLeft className="text-xl"/>
        </button>

        {/* Avatar */}
        <div className="relative">
          <Avatar name={other.name} src={other.avatar}/>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"/>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-none">{other.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isSeller ? 'Customer' : 'Seller'} · Online
          </p>
        </div>

        {convo.product && (
          <Link href={`/products/${convo.product._id}`}
            className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-orange-100 max-w-[120px]">
            <FiPackage className="flex-shrink-0"/>
            <span className="truncate">{convo.product.title}</span>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 sm:border-l sm:border-r sm:border-gray-200 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <FiMessageSquare className="text-4xl mx-auto mb-2"/>
            <p className="text-sm">Start the conversation</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = (isSeller && msg.senderRole === 'seller') ||
                       (!isSeller && msg.senderRole === 'customer')
          const isBot = msg.senderRole === 'bot'

          if (isBot) {
            return (
              <div key={msg._id} className="flex justify-center">
                <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-full px-3 py-1 max-w-xs text-center">
                  {msg.body}
                </div>
              </div>
            )
          }

          return (
            <div key={msg._id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && <Avatar name={other.name} src={other.avatar}/>}
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.body}
                </div>
                <span className="text-[10px] text-gray-400 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && msg.read && <span className="ml-1 text-indigo-400">✓✓</span>}
                </span>
              </div>
            </div>
          )
        })}

        {typing && (
          <div className="flex items-end gap-2">
            <Avatar name={other.name} src={other.avatar}/>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Order context card — pinned above the input (like a marketplace order chat) */}
      {convo.order && showOrderCard && (
        <div className="px-3 pt-2 bg-gray-50 sm:border-l sm:border-r sm:border-gray-200 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 flex items-center gap-3">
            {convo.order.items?.[0]?.image && (
              <img src={convo.order.items[0].image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Order #{convo.order.orderNumber}</p>
              <p className="text-xs text-gray-400">
                Placed on {new Date(convo.order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                {convo.order.items?.length > 1 ? ` · ${convo.order.items.length} items` : ''}
              </p>
            </div>
            <Link href={`/orders/${convo.order._id}`}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors flex-shrink-0">
              View Order
            </Link>
            <button onClick={() => setShowOrderCard(false)} className="text-gray-300 hover:text-gray-500 flex-shrink-0" aria-label="Dismiss">
              <FiX className="text-lg" />
            </button>
          </div>
        </div>
      )}

      {/* Quick replies */}
      <div className="px-3 py-2 bg-gray-50 sm:border-l sm:border-r sm:border-gray-200 overflow-x-auto flex-shrink-0">
        <div className="flex gap-1.5 w-max">
          {quickReplies.map((qr, i) => (
            <button key={i} onClick={() => applyQuickReply(qr)}
              className="text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors whitespace-nowrap flex-shrink-0">
              {qr.length > 30 ? qr.slice(0, 30) + '…' : qr}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2 px-3 py-3 bg-white sm:border sm:rounded-b-2xl sm:border-gray-200 sm:border-t-0 border-t flex-shrink-0">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-24 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />
        <button onClick={sendMessage} disabled={!text.trim() || sending}
          className="self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-2xl flex-shrink-0 transition-colors">
          <FiSend className="text-base"/>
        </button>
      </div>
    </div>
  )
}
