'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FiArrowLeft, FiPhone, FiMessageSquare, FiStar, FiMapPin, FiCheck, FiPackage, FiTruck } from 'react-icons/fi'

const STEPS = [
  { key: 'confirmed',        label: 'Order Confirmed',    icon: '✅', desc: 'Your order has been placed' },
  { key: 'packed',           label: 'Packed',             icon: '📦', desc: 'Securely packed at warehouse' },
  { key: 'picked_up',        label: 'Picked Up',          icon: '🚐', desc: 'Out for dispatch' },
  { key: 'on_the_way',       label: 'On the Way',         icon: '🛵', desc: 'Driver is heading to you' },
  { key: 'nearby',           label: 'Nearby',             icon: '📍', desc: 'Almost at your location' },
  { key: 'delivered',        label: 'Delivered',          icon: '🏠', desc: 'Package delivered' },
]

const DRIVER = { name: 'Rajesh Tamang', rating: 4.8, trips: 1240, vehicle: 'Honda Activa · Ba 12 Pa 4421', phone: '+977 98XXXXXXXX' }

const CHAT_MESSAGES = [
  { from: 'driver', text: 'I am on my way! Will reach in about 15 minutes.' },
  { from: 'driver', text: 'I have arrived at your area. Please keep your phone nearby.' },
]

function DeliveryMap({ progress }: { progress: number }) {
  const truckX = 40 + (progress / 100) * 220
  const truckY = 90 - Math.sin((progress / 100) * Math.PI) * 30

  return (
    <div className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50 rounded-2xl overflow-hidden border border-gray-100" style={{ height: 220 }}>
      <svg viewBox="0 0 300 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Background roads */}
        <rect x="0" y="0" width="300" height="180" fill="none" />
        {/* Grid lines (city blocks) */}
        {[40, 80, 120, 160, 200, 240].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        {[40, 80, 120, 160].map(y => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        {/* Buildings */}
        {[[20,100,30,60],[60,90,25,70],[100,110,20,50],[180,95,28,65],[220,105,22,55],[260,88,30,72]].map(([x,y,w,h],i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={i % 2 === 0 ? '#ddd6fe' : '#bfdbfe'} opacity="0.6" />
        ))}
        {/* Route path */}
        <path
          d="M 40 130 Q 80 120 110 100 Q 150 75 190 90 Q 220 100 260 80"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 40 130 Q 80 120 110 100 Q 150 75 190 90 Q 220 100 260 80"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 4"
          strokeDashoffset={200 - progress * 2}
        />
        {/* Completed path */}
        <path
          d="M 40 130 Q 80 120 110 100 Q 150 75 190 90 Q 220 100 260 80"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="4"
          strokeLinecap="round"
          clipPath="url(#progressClip)"
        />
        <defs>
          <clipPath id="progressClip">
            <rect x="0" y="0" width={40 + (progress / 100) * 220} height="180" />
          </clipPath>
        </defs>

        {/* Origin pin */}
        <circle cx="40" cy="130" r="8" fill="#7c3aed" />
        <text x="40" y="133" textAnchor="middle" fill="white" fontSize="8">📦</text>
        <text x="40" y="148" textAnchor="middle" fill="#6b7280" fontSize="7">Warehouse</text>

        {/* Destination pin */}
        <circle cx="260" cy="80" r="10" fill="#ef4444" />
        <text x="260" y="84" textAnchor="middle" fill="white" fontSize="9">🏠</text>
        <text x="260" y="97" textAnchor="middle" fill="#6b7280" fontSize="7">Your home</text>

        {/* Truck */}
        <g transform={`translate(${truckX - 12}, ${truckY - 12})`}>
          <circle cx="12" cy="12" r="14" fill="#7c3aed" />
          <text x="12" y="16" textAnchor="middle" fontSize="14">🛵</text>
        </g>

        {/* Pulse ring at truck */}
        <circle cx={truckX} cy={truckY} r="20" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.4">
          <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [currentStep, setCurrentStep] = useState(3)
  const [progress, setProgress] = useState(55)
  const [eta, setEta] = useState(14)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState(CHAT_MESSAGES)
  const chatRef = useRef<HTMLDivElement>(null)

  // Simulate truck moving
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(interval); return 95 }
        return p + 0.3
      })
      setEta(e => Math.max(1, e - 0.05))
    }, 300)
    return () => clearInterval(interval)
  }, [])

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    setMessages(m => [...m, { from: 'me', text: chatInput.trim() }])
    setChatInput('')
    setTimeout(() => {
      setMessages(m => [...m, { from: 'driver', text: 'Got it! I\'ll be there soon.' }])
    }, 1500)
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, chatOpen])

  const etaMin = Math.ceil(eta)
  const ordNum = (orderId as string)?.slice(-8).toUpperCase() || 'PP12345'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href="/orders" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900">Live Tracking</h1>
          <p className="text-sm text-gray-500">Order #{ordNum}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* ETA banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs">Estimated arrival</p>
          <p className="text-3xl font-black">{etaMin} min</p>
          <p className="text-white/80 text-xs mt-0.5">Your package is almost there!</p>
        </div>
        <div className="text-6xl opacity-80">🛵</div>
      </div>

      {/* Map */}
      <div className="mb-4">
        <DeliveryMap progress={progress} />
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Warehouse</span>
          <span className="font-semibold text-violet-700">{Math.round(progress)}% complete</span>
          <span>Your home</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="font-black text-gray-900 text-sm mb-3">Delivery Status</h2>
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-all
                  ${done ? 'bg-violet-600 text-white' : active ? 'bg-violet-50 border-2 border-violet-600' : 'bg-gray-100'}`}>
                  {done ? <FiCheck className="text-sm" /> : <span>{step.icon}</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                  {active && <p className="text-xs text-violet-600 font-medium">{step.desc}</p>}
                </div>
                {active && <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">Now</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Driver card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="font-black text-gray-900 text-sm mb-3">Your Delivery Partner</h2>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center flex-shrink-0 text-2xl">
            🧑
          </div>
          <div className="flex-1">
            <p className="font-black text-gray-900">{DRIVER.name}</p>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <FiStar className="fill-amber-400 stroke-amber-400" />
              <span className="font-bold">{DRIVER.rating}</span>
              <span className="text-gray-400">({DRIVER.trips.toLocaleString()} trips)</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{DRIVER.vehicle}</p>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${DRIVER.phone}`}
              className="w-10 h-10 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors">
              <FiPhone />
            </a>
            <button onClick={() => setChatOpen(c => !c)}
              className="w-10 h-10 rounded-xl bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-600 transition-colors">
              <FiMessageSquare />
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      {chatOpen && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-violet-50">
            <p className="font-bold text-sm text-gray-900">Chat with {DRIVER.name.split(' ')[0]}</p>
          </div>
          <div ref={chatRef} className="p-4 space-y-3 max-h-48 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  msg.from === 'me'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="border-t border-gray-100 p-3 flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400"
            />
            <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors">
              Send
            </button>
          </form>
        </div>
      )}

      {/* Delivery address */}
      <div className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3">
        <FiMapPin className="text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-900">Delivering to</p>
          <p className="text-sm text-gray-600 mt-0.5">Your saved delivery address</p>
          <p className="text-xs text-gray-400 mt-0.5">Kathmandu, Nepal</p>
        </div>
      </div>
    </div>
  )
}
