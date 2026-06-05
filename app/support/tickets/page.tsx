'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { FiMessageSquare, FiClock, FiChevronRight, FiPlus } from 'react-icons/fi'

interface Ticket {
  _id: string; ticketNumber: string; subject: string
  status: string; priority: string; category: string
  createdAt: string; assignedAgent?: { name: string }
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
  high: 'text-orange-500', urgent: 'text-red-600',
}

export default function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    axios.get('/api/support/tickets').then(r => setTickets(r.data.data || []))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Support Tickets</h1>
          <p className="text-sm text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/support" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
          <FiPlus/> New Ticket
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <FiMessageSquare className="text-4xl mx-auto mb-2"/>
          <p className="font-medium text-gray-600">No tickets yet</p>
          <p className="text-sm mb-4">Need help? Open a support ticket.</p>
          <Link href="/support" className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">Get Help</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Link key={ticket._id} href={`/support/tickets/${ticket._id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-indigo-600">#{ticket.ticketNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="capitalize">{ticket.category}</span>
                    <span className="flex items-center gap-1"><FiClock/>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.assignedAgent && <span>Agent: {ticket.assignedAgent.name}</span>}
                  </div>
                </div>
                <FiChevronRight className="text-gray-400 flex-shrink-0 mt-1"/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
