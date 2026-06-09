'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { FiMessageCircle, FiX, FiSend, FiMinus } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'bot'
  text: string
  time: string
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const GREET: Message = {
  role: 'bot',
  text: 'Hi! 👋 I\'m your Primepasal assistant. Ask me anything — orders, returns, products, or type **"agent"** to reach support.',
  time: now(),
}

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false)
  const [minimised, setMinimised] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREET])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80) }
  }, [open, messages])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', text, time: now() }
    setMessages(p => [...p, userMsg])
    setLoading(true)
    try {
      const res = await axios.post('/api/support/chat', { message: text })
      const botMsg: Message = { role: 'bot', text: res.data.reply || res.data.message || 'Sorry, I couldn\'t process that.', time: now() }
      setMessages(p => [...p, botMsg])
      if (!open) setUnread(c => c + 1)
    } catch {
      setMessages(p => [...p, { role: 'bot', text: 'Something went wrong. Please try again.', time: now() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-full shadow-2xl shadow-violet-400/40 flex items-center justify-center hover:scale-110 transition-transform press-effect"
          aria-label="Open chat"
        >
          <FiMessageCircle className="text-2xl" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={cn(
          'fixed z-50 right-4 lg:right-6 bottom-20 lg:bottom-6 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-3xl shadow-2xl shadow-black/20 border border-gray-200 flex flex-col transition-all',
          minimised ? 'h-14' : 'h-[480px]'
        )}>
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-3xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🤖</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Primepasal Support</p>
              <p className="text-[11px] text-violet-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online · Instant replies
              </p>
            </div>
            <button onClick={() => setMinimised(m => !m)} className="text-white/70 hover:text-white p-1 transition-colors">
              <FiMinus />
            </button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1 transition-colors">
              <FiX />
            </button>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🤖</div>
                    )}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    )}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                      <p className={cn('text-[10px] mt-1 text-right', msg.role === 'user' ? 'text-violet-200' : 'text-gray-400')}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick replies */}
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                {['Track order', 'Return item', 'Payment issue', 'Talk to agent'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); setTimeout(() => send(), 50) }}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={send} className="flex gap-2 px-4 pb-4 flex-shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0 self-end"
                >
                  <FiSend className="text-sm" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
