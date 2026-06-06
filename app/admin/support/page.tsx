'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FiRefreshCw, FiBook, FiTrendingUp, FiPlus,
  FiEdit2, FiTrash2, FiX, FiSend, FiSearch,
  FiChevronRight, FiUser, FiClock, FiList,
} from 'react-icons/fi'

interface Metrics {
  totalTickets: number; openTickets: number; resolvedTickets: number
  avgCsat: string; avgResponseHrs: number | null; resolutionRate: number
  byCategory: { _id: string; count: number }[]
}
interface Article { _id: string; title: string; category: string; views: number; isPublished: boolean }

interface Ticket {
  _id: string; ticketNumber: string; subject: string; status: string
  priority: string; category: string; createdAt: string; updatedAt: string
  customer: { _id: string; name: string; email: string }
  assignedAgent?: { name: string }
}
interface Message {
  _id: string; sender: { name: string; role: string }; senderRole: string
  body: string; isInternal: boolean; createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  open:             'bg-blue-100 text-blue-700',
  in_progress:      'bg-yellow-100 text-yellow-700',
  waiting_customer: 'bg-orange-100 text-orange-700',
  resolved:         'bg-green-100 text-green-700',
  closed:           'bg-gray-100 text-gray-600',
}
const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-gray-500', medium: 'text-blue-500',
  high: 'text-orange-500', urgent: 'text-red-600 font-bold',
}

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab]           = useState<'metrics' | 'tickets' | 'articles'>('tickets')
  const [metrics, setMetrics]   = useState<Metrics | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)

  // Ticket inbox state
  const [tickets,        setTickets]        = useState<Ticket[]>([])
  const [ticketFilter,   setTicketFilter]   = useState({ status: 'open', priority: '', q: '' })
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages,       setMessages]       = useState<Message[]>([])
  const [reply,          setReply]          = useState('')
  const [isInternal,     setIsInternal]     = useState(false)
  const [sending,        setSending]        = useState(false)
  const [ticketLoading,  setTicketLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Article form state
  const [showForm,     setShowForm]     = useState(false)
  const [editArticle,  setEditArticle]  = useState<Article | null>(null)
  const [form,         setForm]         = useState({ title: '', body: '', category: 'orders', tags: '' })
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') { router.push('/login'); return }
  }, [user, authLoading, router])

  const fetchMetrics = useCallback(async () => {
    try { const r = await axios.get('/api/admin/support/metrics'); setMetrics(r.data.data) } catch {}
  }, [])

  const fetchArticles = useCallback(async () => {
    try { const r = await axios.get('/api/support/articles?limit=50'); setArticles(r.data.data || []) } catch {}
  }, [])

  const fetchTickets = useCallback(async () => {
    const p = new URLSearchParams()
    if (ticketFilter.status)   p.set('status',   ticketFilter.status)
    if (ticketFilter.priority) p.set('priority', ticketFilter.priority)
    if (ticketFilter.q)        p.set('q',        ticketFilter.q)
    try { const r = await axios.get(`/api/support/tickets?${p}`); setTickets(r.data.data || []) } catch {}
  }, [ticketFilter])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    setLoading(true)
    Promise.all([fetchMetrics(), fetchArticles(), fetchTickets()]).finally(() => setLoading(false))
  }, [fetchMetrics, fetchArticles, fetchTickets, user])

  // Auto-refresh ticket list every 30s
  useEffect(() => {
    if (tab !== 'tickets') return
    const interval = setInterval(fetchTickets, 30000)
    return () => clearInterval(interval)
  }, [tab, fetchTickets])

  // Auto-scroll messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket)
    setTicketLoading(true)
    try {
      const r = await axios.get(`/api/support/tickets/${ticket._id}`)
      setMessages(r.data.data.messages || [])
    } catch { toast.error('Failed to load ticket') }
    finally { setTicketLoading(false) }
  }

  async function sendReply() {
    if (!reply.trim() || !selectedTicket) return
    setSending(true)
    try {
      const r = await axios.post(`/api/support/tickets/${selectedTicket._id}/messages`, { body: reply, isInternal })
      setMessages(p => [...p, r.data.data])
      setReply('')
      // Refresh ticket status
      const tr = await axios.get(`/api/support/tickets/${selectedTicket._id}`)
      setSelectedTicket(tr.data.data.ticket)
      fetchTickets()
      toast.success(isInternal ? 'Internal note added' : 'Reply sent')
    } catch { toast.error('Failed to send reply') }
    finally { setSending(false) }
  }

  async function updateStatus(status: string) {
    if (!selectedTicket) return
    try {
      await axios.patch(`/api/support/tickets/${selectedTicket._id}`, { status })
      setSelectedTicket(t => t ? { ...t, status } : t)
      fetchTickets()
      toast.success(`Status → ${status.replace(/_/g, ' ')}`)
    } catch { toast.error('Failed to update status') }
  }

  async function updatePriority(priority: string) {
    if (!selectedTicket) return
    try {
      await axios.patch(`/api/support/tickets/${selectedTicket._id}`, { priority })
      setSelectedTicket(t => t ? { ...t, priority } : t)
      fetchTickets()
    } catch {}
  }

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      if (editArticle) {
        await axios.put(`/api/support/articles/${editArticle._id}`, { ...form, tags })
        toast.success('Article updated')
      } else {
        await axios.post('/api/support/articles', { ...form, tags })
        toast.success('Article created')
      }
      setShowForm(false); setEditArticle(null); setForm({ title: '', body: '', category: 'orders', tags: '' })
      fetchArticles()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article?')) return
    await axios.delete(`/api/support/articles/${id}`)
    toast.success('Deleted')
    fetchArticles()
  }

  function openEdit(a: Article) {
    setEditArticle(a)
    setForm({ title: a.title, body: '', category: a.category, tags: '' })
    setShowForm(true)
  }

  async function seedSupport() {
    try {
      const r = await axios.post('/api/seed/support')
      toast.success(r.data.message)
      fetchArticles(); fetchMetrics()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Seed failed')
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Support Admin</h1>
        <div className="flex gap-2">
          <button onClick={seedSupport}
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Seed Demo Data
          </button>
          <button onClick={() => { fetchMetrics(); fetchArticles(); fetchTickets() }}
            className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
            <FiRefreshCw className="text-xs"/> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {([
          { key: 'tickets',  label: 'Tickets',  icon: FiList },
          { key: 'metrics',  label: 'Metrics',  icon: FiTrendingUp },
          { key: 'articles', label: 'Articles', icon: FiBook },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium capitalize flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="text-sm"/>{t.label}
            {t.key === 'tickets' && tickets.filter(tk => tk.status === 'open').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {tickets.filter(tk => tk.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ TICKETS TAB ══ */}
      {tab === 'tickets' && (
        <div className={`flex gap-4 ${selectedTicket ? 'flex-col lg:flex-row' : ''}`}>

          {/* Left: Ticket list */}
          <div className={selectedTicket ? 'lg:w-80 flex-shrink-0' : 'w-full'}>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[140px]">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"/>
                <input
                  value={ticketFilter.q}
                  onChange={e => setTicketFilter(f => ({ ...f, q: e.target.value }))}
                  placeholder="Search tickets..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={ticketFilter.status}
                onChange={e => setTicketFilter(f => ({ ...f, status: e.target.value }))}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting Customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={ticketFilter.priority}
                onChange={e => setTicketFilter(f => ({ ...f, priority: e.target.value }))}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Ticket list */}
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiList className="text-4xl mx-auto mb-2"/>
                  <p className="text-sm">No tickets found</p>
                </div>
              ) : (
                tickets.map(ticket => (
                  <button key={ticket._id}
                    onClick={() => openTicket(ticket)}
                    className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-md transition-all ${
                      selectedTicket?._id === ticket._id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-gray-200'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="font-mono text-[10px] text-indigo-600">#{ticket.ticketNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                            {ticket.status.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-[10px] font-medium capitalize ${PRIORITY_COLOR[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                          <span className="flex items-center gap-0.5"><FiUser/>{ticket.customer?.name}</span>
                          <span className="flex items-center gap-0.5"><FiClock/>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <FiChevronRight className="text-gray-400 flex-shrink-0 mt-1"/>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Ticket detail panel */}
          {selectedTicket && (
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex flex-col" style={{ height: '70vh', minHeight: '400px' }}>

              {/* Panel header */}
              <div className="flex items-start justify-between p-4 border-b border-gray-100 flex-shrink-0 flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono text-xs text-indigo-600">#{selectedTicket.ticketNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[selectedTicket.status] || 'bg-gray-100 text-gray-600'}`}>
                      {selectedTicket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate">{selectedTicket.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {selectedTicket.category} · {selectedTicket.customer?.name} ({selectedTicket.customer?.email})
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status control */}
                  <select
                    value={selectedTicket.status}
                    onChange={e => updateStatus(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  {/* Priority control */}
                  <select
                    value={selectedTicket.priority}
                    onChange={e => updatePriority(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
                    <FiX/>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {ticketLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : messages.map(msg => {
                  const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'agent'
                  return (
                    <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm ${
                        msg.isInternal ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                        isAdmin ? 'bg-indigo-600 text-white' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <p className={`text-[10px] mb-1 font-medium ${isAdmin ? (msg.isInternal ? 'text-yellow-600' : 'text-indigo-200') : 'text-gray-400'}`}>
                          {msg.sender?.name || msg.senderRole}
                          {msg.isInternal && ' 🔒 Internal'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className={`text-[10px] mt-1 ${isAdmin ? (msg.isInternal ? 'text-yellow-500' : 'text-indigo-300') : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef}/>
              </div>

              {/* Canned responses */}
              <div className="px-4 pb-1 flex-shrink-0 flex flex-wrap gap-1.5">
                {[
                  'Thank you for contacting PrimePasal support. We are looking into your issue.',
                  'Your issue has been resolved. Please let us know if you need further help.',
                  'We have escalated this to our team and will update you within 24 hours.',
                ].map((text, i) => (
                  <button key={i} onClick={() => setReply(text)}
                    className="text-[10px] bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors truncate max-w-[200px]">
                    {text.slice(0, 35)}…
                  </button>
                ))}
              </div>

              {/* Reply box */}
              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
                  <div className="flex items-center gap-3 mb-1">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Internal note (hidden from customer)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply() }}
                      placeholder={isInternal ? 'Add an internal note...' : 'Type your reply... (Ctrl+Enter to send)'}
                      rows={3}
                      className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
                        isInternal
                          ? 'border-yellow-300 bg-yellow-50 focus:ring-yellow-400'
                          : 'border-gray-300 focus:ring-indigo-500'
                      }`}
                    />
                    <button onClick={sendReply} disabled={!reply.trim() || sending}
                      className="self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl flex-shrink-0">
                      <FiSend/>
                    </button>
                  </div>
                </div>
              )}
              {['resolved', 'closed'].includes(selectedTicket.status) && (
                <p className="text-center text-sm text-gray-400 p-4">
                  This ticket is {selectedTicket.status}. Change status to reply.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ METRICS TAB ══ */}
      {tab === 'metrics' && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Tickets',    value: metrics.totalTickets },
              { label: 'Open Tickets',     value: metrics.openTickets },
              { label: 'Resolution Rate',  value: metrics.resolutionRate + '%' },
              { label: 'Avg CSAT',         value: metrics.avgCsat + ' / 5' },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4">
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {metrics.avgResponseHrs !== null && (
            <div className="bg-white border rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Avg First Response Time</p>
              <p className="text-2xl font-black text-indigo-600">{metrics.avgResponseHrs}h</p>
            </div>
          )}
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Tickets by Category</p>
            <div className="space-y-2">
              {metrics.byCategory.map(c => {
                const pct = metrics.totalTickets > 0 ? Math.round(c.count / metrics.totalTickets * 100) : 0
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 capitalize w-28">{c._id}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }}/>
                    </div>
                    <p className="text-xs text-gray-500 w-8 text-right">{c.count}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ ARTICLES TAB ══ */}
      {tab === 'articles' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditArticle(null); setForm({ title: '', body: '', category: 'orders', tags: '' }); setShowForm(true) }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">
              <FiPlus/> New Article
            </button>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FiBook className="text-4xl mx-auto mb-2"/>
                <p>No articles yet. Click &quot;Seed Demo Data&quot; to add sample articles.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Title', 'Category', 'Views', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articles.map(a => (
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="text-xs font-medium text-gray-900">{a.title}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{a.category}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.views}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(a)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><FiEdit2/>Edit</button>
                          <button onClick={() => deleteArticle(a._id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"><FiTrash2/>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Article Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">{editArticle ? 'Edit Article' : 'New Help Article'}</h2>
              <button onClick={() => setShowForm(false)}><FiX className="text-gray-400"/></button>
            </div>
            <form onSubmit={saveArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['orders', 'payments', 'shipping', 'returns', 'account', 'general'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your article content here..."
                  rows={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required={!editArticle}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="order, track, shipping"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                  {saving ? 'Saving...' : editArticle ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
