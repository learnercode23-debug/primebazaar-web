'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  FiSearch, FiMessageSquare, FiPackage, FiRotateCcw,
  FiCreditCard, FiTruck, FiUser, FiChevronRight,
  FiSend, FiX, FiHelpCircle, FiList
} from 'react-icons/fi'

interface Article { _id: string; title: string; category: string; views: number }
interface ChatMsg  { role: 'user' | 'bot'; text: string }

const CATEGORIES = [
  { key: 'orders',   label: 'Orders',   icon: FiPackage,     color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'payments', label: 'Payments', icon: FiCreditCard,  color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'shipping', label: 'Shipping', icon: FiTruck,       color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { key: 'returns',  label: 'Returns',  icon: FiRotateCcw,   color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'account',  label: 'Account',  icon: FiUser,        color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: 'general',  label: 'General',  icon: FiHelpCircle,  color: 'bg-gray-50 text-gray-600 border-gray-200' },
]

export default function SupportPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Help center
  const [searchQ,    setSearchQ]    = useState('')
  const [articles,   setArticles]   = useState<Article[]>([])
  const [searching,  setSearching]  = useState(false)
  const [activeCategory, setActiveCategory] = useState('')

  // Chat
  const [chatOpen,   setChatOpen]   = useState(false)
  const [chatMsgs,   setChatMsgs]   = useState<ChatMsg[]>([
    { role: 'bot', text: 'Hi! I\'m the Primepasal support bot. How can I help you today? You can ask about orders, returns, payments, or shipping.' }
  ])
  const [chatInput,  setChatInput]  = useState('')
  const [chatBusy,   setChatBusy]   = useState(false)
  const [escalated,  setEscalated]  = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // New ticket form
  const [showTicket, setShowTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({ category: 'order', subject: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  // Load articles
  useEffect(() => {
    async function load() {
      setSearching(true)
      try {
        const p = new URLSearchParams()
        if (searchQ) p.set('q', searchQ)
        if (activeCategory) p.set('category', activeCategory)
        const res = await axios.get(`/api/support/articles?${p}&limit=8`)
        setArticles(res.data.data || [])
      } catch { setArticles([]) }
      finally  { setSearching(false) }
    }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [searchQ, activeCategory])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, chatOpen])

  // Send chat message
  async function sendChat() {
    if (!chatInput.trim() || chatBusy) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMsgs(p => [...p, { role: 'user', text: msg }])
    setChatBusy(true)

    // Escalate keywords
    if (['agent', 'human', 'person', 'help me'].some(k => msg.toLowerCase().includes(k))) {
      if (!user) {
        setChatMsgs(p => [...p, { role: 'bot', text: 'Please log in first to connect with a human agent. [Login →](/login)' }])
        setChatBusy(false)
        return
      }
      try {
        const res = await axios.post('/api/support/chat/escalate')
        setEscalated(true)
        setChatMsgs(p => [...p, { role: 'bot', text: `✓ Connected! A support agent will reply to your ticket **#${res.data.ticketNumber}** shortly. You can track it in [My Tickets](/support/tickets).` }])
      } catch {
        setChatMsgs(p => [...p, { role: 'bot', text: 'Unable to connect to an agent right now. Please [create a support ticket](/support) instead.' }])
      }
      setChatBusy(false)
      return
    }

    try {
      const res = await axios.post('/api/support/chat', { message: msg })
      setChatMsgs(p => [...p, { role: 'bot', text: res.data.botReply }])
    } catch {
      setChatMsgs(p => [...p, { role: 'bot', text: 'Sorry, I had trouble processing that. Say **"agent"** to talk to a person.' }])
    }
    setChatBusy(false)
  }

  // Submit ticket
  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { router.push('/login'); return }
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast.error('Subject and description are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await axios.post('/api/support/tickets', ticketForm)
      toast.success(`Ticket #${res.data.data.ticketNumber} created!`)
      setShowTicket(false)
      setTicketForm({ category: 'order', subject: '', description: '' })
      router.push(`/support/tickets/${res.data.data._id}`)
    } catch {
      toast.error('Failed to create ticket')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-8">

      {/* Header */}
      <div className="text-center py-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white px-6">
        <FiHelpCircle className="text-5xl mx-auto mb-3 opacity-90"/>
        <h1 className="text-3xl font-black mb-2">How can we help?</h1>
        <p className="text-indigo-200 mb-6">Search our Help Center or contact our support team</p>
        <div className="relative max-w-md mx-auto">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"/>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search for help..."
            className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/orders',            icon: FiPackage,       label: 'Track Order',    color: 'bg-blue-50 text-blue-700' },
          { href: '#ticket',            icon: FiMessageSquare, label: 'New Ticket',     color: 'bg-indigo-50 text-indigo-700', onClick: () => setShowTicket(true) },
          { href: '/support/tickets',   icon: FiList,          label: 'My Tickets',     color: 'bg-purple-50 text-purple-700' },
          { href: '#chat',              icon: FiMessageSquare, label: 'Live Chat',      color: 'bg-green-50 text-green-700', onClick: () => setChatOpen(true) },
        ].map(a => (
          <button key={a.label}
            onClick={a.onClick || (() => router.push(a.href))}
            className={`${a.color} border rounded-xl p-4 text-left hover:shadow-md transition-shadow`}>
            <a.icon className="text-2xl mb-2"/>
            <p className="text-sm font-semibold">{a.label}</p>
          </button>
        ))}
      </div>

      {/* Categories */}
      <div>
        <h2 className="font-bold text-gray-900 text-lg mb-3">Browse by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? '' : cat.key)}
              className={`border rounded-xl p-3 text-center transition-all text-xs font-medium ${
                activeCategory === cat.key ? cat.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              <cat.icon className="text-xl mx-auto mb-1"/>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Help Articles */}
      <div>
        <h2 className="font-bold text-gray-900 text-lg mb-3">
          {searchQ ? `Results for "${searchQ}"` : activeCategory ? `${CATEGORIES.find(c=>c.key===activeCategory)?.label} Articles` : 'Popular Articles'}
        </h2>
        {searching ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : articles.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FiHelpCircle className="text-4xl mx-auto mb-2"/>
            <p>No articles found. Try a different search or <button onClick={() => setShowTicket(true)} className="text-indigo-600 underline">open a ticket</button>.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map(article => (
              <Link key={article._id} href={`/support/articles/${article._id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-indigo-300 transition-all group">
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">{article.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{article.category} · {article.views} views</p>
                </div>
                <FiChevronRight className="text-gray-400 group-hover:text-indigo-600 flex-shrink-0"/>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Can't find answer? */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
        <h3 className="font-bold text-gray-900 mb-1">Still need help?</h3>
        <p className="text-sm text-gray-500 mb-4">Our support team is available 24/7</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => setShowTicket(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
            <FiMessageSquare/> Open a Ticket
          </button>
          <button onClick={() => setChatOpen(true)}
            className="bg-white border border-indigo-300 text-indigo-700 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-indigo-50">
            <FiMessageSquare/> Live Chat
          </button>
        </div>
      </div>

      {/* ══ New Ticket Modal ══ */}
      {showTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Open a Support Ticket</h2>
              <button onClick={() => setShowTicket(false)}><FiX className="text-gray-400"/></button>
            </div>
            {!user ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Please log in to create a support ticket.</p>
                <Link href="/login" className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">Log In</Link>
              </div>
            ) : (
              <form onSubmit={submitTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={ticketForm.category} onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['order','payment','shipping','return','product','account','other'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input value={ticketForm.subject} onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief description of the issue"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required maxLength={200}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Please describe your issue in detail..."
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowTicket(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ Live Chat Widget ══ */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: '520px' }}>
          {/* Chat header */}
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
              <div>
                <p className="font-bold text-sm leading-none">PrimePasal Support</p>
                <p className="text-indigo-200 text-[10px] mt-0.5">Typically replies instantly</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)}><FiX className="text-white/80 hover:text-white"/></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {chatMsgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          {/* Quick suggestion chips — only show when at start */}
          {chatMsgs.length <= 1 && !escalated && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {[
                'Track my order',
                'Return & refund',
                'Khalti payment',
                'Cancel order',
                'Delivery time',
                'Talk to agent',
              ].map(chip => (
                <button key={chip}
                  onClick={() => { setChatInput(chip); setTimeout(() => sendChat(), 50) }}
                  className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1 hover:bg-indigo-100 transition-colors">
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Escalate note */}
          {!escalated && chatMsgs.length > 1 && (
            <p className="text-center text-[10px] text-gray-400 px-3 pb-1 flex-shrink-0">
              Say <strong>&quot;agent&quot;</strong> to talk to a human
            </p>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2 flex-shrink-0">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
              placeholder={escalated ? 'Check your tickets for updates' : 'Type a message...'}
              disabled={chatBusy || escalated}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <button onClick={sendChat} disabled={chatBusy || !chatInput.trim() || escalated}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl flex-shrink-0">
              <FiSend className="text-sm"/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
