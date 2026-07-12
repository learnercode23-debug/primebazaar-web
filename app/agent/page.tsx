'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  FiRefreshCw, FiMessageSquare, FiUser, FiChevronRight,
  FiAlertCircle, FiClock, FiCheck
} from 'react-icons/fi'
import Link from 'next/link'

interface Ticket {
  _id: string; ticketNumber: string; subject: string
  status: string; priority: string; category: string; createdAt: string
  customer: { name: string; email: string }
  assignedAgent?: { name: string }
}
interface Counts { open: number; in_progress: number; waiting: number; resolved: number }

const STATUS_COLOR: Record<string,string> = {
  open:'bg-blue-100 text-blue-700', in_progress:'bg-yellow-100 text-yellow-700',
  waiting_customer:'bg-orange-100 text-orange-700', resolved:'bg-green-100 text-green-700', closed:'bg-gray-100 text-gray-600',
}
const PRIORITY_ICON: Record<string,string> = { low:'🟢', medium:'🟡', high:'🟠', urgent:'🔴' }

export default function AgentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [counts,  setCounts]    = useState<Counts>({ open:0, in_progress:0, waiting:0, resolved:0 })
  const [loading, setLoading]   = useState(true)
  const [total,   setTotal]     = useState(0)
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [assignedToMe,   setAssignedToMe]   = useState(false)

  // Ticket detail modal
  const [selected,    setSelected]    = useState<Ticket | null>(null)
  const [detail,      setDetail]      = useState<{ ticket: Ticket; messages: unknown[] } | null>(null)
  const [reply,       setReply]       = useState('')
  const [isInternal,  setIsInternal]  = useState(false)
  const [newStatus,   setNewStatus]   = useState('')
  const [sending,     setSending]     = useState(false)
  const [updating,    setUpdating]    = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'admin' && user.role !== 'seller') { router.push('/'); return }
  }, [user, authLoading, router])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filterStatus)   p.set('status',       filterStatus)
      if (filterPriority) p.set('priority',      filterPriority)
      if (filterCategory) p.set('category',      filterCategory)
      if (assignedToMe)   p.set('assignedToMe', 'true')
      const res = await axios.get(`/api/agent/tickets?${p}`)
      setTickets(res.data.data || [])
      setTotal(res.data.total || 0)
      setCounts(res.data.counts || { open:0, in_progress:0, waiting:0, resolved:0 })
    } catch { toast.error('Failed to load tickets') }
    finally  { setLoading(false) }
  }, [filterStatus, filterPriority, filterCategory, assignedToMe])

  useEffect(() => { if (user?.role === 'admin' || user?.role === 'seller') fetchTickets() }, [fetchTickets, user])

  async function openTicket(ticket: Ticket) {
    setSelected(ticket)
    setNewStatus(ticket.status)
    setDetail(null)
    try {
      const res = await axios.get(`/api/support/tickets/${ticket._id}`)
      setDetail(res.data.data)
    } catch { setDetail(null); toast.error('Failed to load ticket') }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      await axios.post(`/api/support/tickets/${selected._id}/messages`, { body: reply, isInternal })
      toast.success(isInternal ? 'Note added' : 'Reply sent')
      setReply('')
      const res = await axios.get(`/api/support/tickets/${selected._id}`)
      setDetail(res.data.data)
    } catch { toast.error('Failed') }
    finally  { setSending(false) }
  }

  async function updateTicket() {
    if (!selected) return
    setUpdating(true)
    try {
      await axios.patch(`/api/support/tickets/${selected._id}`, {
        status:        newStatus,
        assignedAgent: user!._id,
      })
      toast.success('Ticket updated')
      fetchTickets()
      setSelected(null)
    } catch { toast.error('Failed') }
    finally  { setUpdating(false) }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-sm text-gray-500">{total} tickets total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/support" className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Admin Panel</Link>
          <button onClick={fetchTickets} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
            <FiRefreshCw className="text-xs"/> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Open',         value: counts.open,        color:'bg-blue-50 text-blue-700 border-blue-200',   icon: FiAlertCircle },
          { label:'In Progress',  value: counts.in_progress, color:'bg-yellow-50 text-yellow-700 border-yellow-200', icon: FiClock },
          { label:'Waiting',      value: counts.waiting,     color:'bg-orange-50 text-orange-700 border-orange-200', icon: FiMessageSquare },
          { label:'Resolved',     value: counts.resolved,    color:'bg-green-50 text-green-700 border-green-200',  icon: FiCheck },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value)}}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['open','in_progress','waiting_customer','resolved','closed'].map(s=>(
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Priorities</option>
          {['low','medium','high','urgent'].map(p=>(<option key={p} value={p}>{p}</option>))}
        </select>
        <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Categories</option>
          {['order','payment','shipping','return','product','account','other'].map(c=>(<option key={c} value={c}>{c}</option>))}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={assignedToMe} onChange={e=>setAssignedToMe(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded"/>
          Assigned to me
        </label>
      </div>

      {/* Tickets table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-14 text-gray-400"><FiMessageSquare className="text-4xl mx-auto mb-2"/><p>No tickets found</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ticket','Customer','Subject','Status','Priority','Created','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map(t => (
                <tr key={t._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openTicket(t)}>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-indigo-600">#{t.ticketNumber}</span></td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-900">{t.customer?.name}</p>
                    <p className="text-xs text-gray-400">{t.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3"><p className="text-xs font-medium truncate max-w-[180px]">{t.subject}</p></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[t.status]||'bg-gray-100 text-gray-600'}`}>
                      {t.status.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-sm">{PRIORITY_ICON[t.priority]} {t.priority}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={e=>{e.stopPropagation();openTicket(t)}}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                      View <FiChevronRight/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ Ticket Detail Modal ══ */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-indigo-600">#{selected.ticketNumber}</p>
                <h2 className="font-bold text-gray-900">{selected.subject}</h2>
                <p className="text-xs text-gray-500 capitalize">{selected.category} · {selected.customer?.name}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!detail && (
                <div className="flex justify-center py-14"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
              )}
              {(detail?.messages as {_id:string;senderRole:string;body:string;isInternal:boolean;sender:{name:string};createdAt:string}[] || []).map(msg => (
                <div key={msg._id} className={`rounded-xl p-3 text-sm ${
                  msg.isInternal ? 'bg-yellow-50 border border-yellow-200' :
                  msg.senderRole === 'customer' ? 'bg-indigo-50' : 'bg-gray-50 border'
                }`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-xs text-gray-600">
                      {msg.sender?.name} {msg.isInternal && <span className="bg-yellow-200 text-yellow-800 px-1 rounded text-[10px] ml-1">Internal</span>}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))}
            </div>

            {/* Agent controls */}
            <div className="p-4 border-t space-y-3">
              <div className="flex gap-2 flex-wrap">
                <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1">
                  {['open','in_progress','waiting_customer','resolved','closed'].map(s=>(
                    <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                  ))}
                </select>
                <button onClick={updateTicket} disabled={updating}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-1.5 rounded-lg">
                  {updating?'Saving...':'Update Status'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <textarea value={reply} onChange={e=>setReply(e.target.value)}
                  placeholder="Reply to customer or add internal note..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-yellow-700">
                    <input type="checkbox" checked={isInternal} onChange={e=>setIsInternal(e.target.checked)} className="w-4 h-4"/>
                    Internal note (not visible to customer)
                  </label>
                  <button onClick={sendReply} disabled={!reply.trim()||sending}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
                    <FiUser/> {sending?'Sending...': isInternal ? 'Add Note' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
