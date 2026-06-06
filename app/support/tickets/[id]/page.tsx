'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiSend, FiArrowLeft, FiPackage } from 'react-icons/fi'
import Link from 'next/link'

interface Message { _id: string; sender: { name: string; role: string }; senderRole: string; body: string; isInternal: boolean; createdAt: string }
interface Ticket  { _id: string; ticketNumber: string; subject: string; status: string; priority: string; category: string; createdAt: string; order?: { orderNumber: string; status: string } }

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_customer: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600',
}

export default function TicketDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [ticket,    setTicket]    = useState<Ticket | null>(null)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loading,   setLoading]   = useState(true)
  const [reply,     setReply]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [csat,      setCsat]      = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    axios.get(`/api/support/tickets/${id}`)
      .then(r => { setTicket(r.data.data.ticket); setMessages(r.data.data.messages || []) })
      .catch(() => router.push('/support/tickets'))
      .finally(() => setLoading(false))
  }, [id, user, authLoading, router])

  // Poll for new messages every 20 seconds while ticket is open
  useEffect(() => {
    if (!user || loading) return
    const interval = setInterval(async () => {
      try {
        const r = await axios.get(`/api/support/tickets/${id}`)
        setMessages(r.data.data.messages || [])
        setTicket(r.data.data.ticket)
      } catch {}
    }, 20000)
    return () => clearInterval(interval)
  }, [id, user, loading])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await axios.post(`/api/support/tickets/${id}/messages`, { body: reply })
      setMessages(p => [...p, res.data.data])
      setReply('')
      // Refresh ticket status
      const tr = await axios.get(`/api/support/tickets/${id}`)
      setTicket(tr.data.data.ticket)
    } catch { toast.error('Failed to send reply') }
    finally  { setSending(false) }
  }

  async function submitCsat(rating: number) {
    setCsat(rating)
    await axios.patch(`/api/support/tickets/${id}`, { csat: rating }).catch(console.error)
    toast.success('Thank you for your feedback!')
  }

  if (authLoading || !user || loading) return (
    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
  )
  if (!ticket) return null

  const isClosed = ['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-4">
      {/* Header */}
      <div>
        <Link href="/support/tickets" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <FiArrowLeft/> My Tickets
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="font-mono text-xs text-indigo-600 mb-1">#{ticket.ticketNumber}</p>
              <h1 className="font-bold text-gray-900 text-lg">{ticket.subject}</h1>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
              {ticket.status.replace(/_/g, ' ')}
            </span>
          </div>
          {ticket.order && (
            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-sm">
              <FiPackage className="text-gray-400"/>
              <span className="text-gray-600">Order #{ticket.order.orderNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize`}>{ticket.order.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map(msg => {
          const isCustomer = msg.senderRole === 'customer'
          return (
            <div key={msg._id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isCustomer ? 'bg-indigo-600 text-white' :
                msg.senderRole === 'bot' ? 'bg-gray-100 text-gray-800' :
                'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className={`text-xs mb-1 font-medium ${isCustomer ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {msg.sender?.name || msg.senderRole}
                  {msg.senderRole === 'agent' && ' (Support Agent)'}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1 ${isCustomer ? 'text-indigo-300' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* CSAT rating for resolved tickets */}
      {isClosed && !csat && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="font-medium text-gray-900 mb-2">How was your support experience?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => submitCsat(n)}
                className="w-10 h-10 rounded-full border-2 border-yellow-400 hover:bg-yellow-400 hover:text-white text-lg transition-all">
                {['😞','😕','😐','😊','😄'][n-1]}
              </button>
            ))}
          </div>
        </div>
      )}
      {csat && <p className="text-center text-sm text-green-600">Thank you for your rating! ⭐{csat}/5</p>}

      {/* Reply box */}
      {!isClosed && (
        <form onSubmit={sendReply} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Reply to this ticket</label>
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={!reply.trim() || sending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              <FiSend/> {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      )}
      {isClosed && <p className="text-center text-sm text-gray-400">This ticket is {ticket.status}. <Link href="/support" className="text-indigo-600 underline">Open a new ticket</Link> if you need more help.</p>}
    </div>
  )
}
