'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiMapPin, FiClock, FiPackage, FiSearch, FiChevronDown, FiCheck, FiSmartphone, FiNavigation } from 'react-icons/fi'

interface Locker {
  id: string
  name: string
  type: 'hub' | 'locker' | 'point'
  area: string
  address: string
  hours: string
  slots: { total: number; available: number }
  sizes: ('S' | 'M' | 'L' | 'XL')[]
  features: string[]
  x: number  // SVG map position %
  y: number
  distance?: string
  open: boolean
}

const LOCKERS: Locker[] = [
  {
    id: 'pp-thamel', name: 'PrimePasal Hub — Thamel', type: 'hub',
    area: 'Thamel, Kathmandu', address: 'Thamel Marg, near Kathmandu Guest House',
    hours: '8AM–9PM daily', slots: { total: 40, available: 12 }, sizes: ['S','M','L','XL'],
    features: ['Staff assisted', 'Refrigerated slots', 'Returns accepted', 'CCTV 24/7'],
    x: 42, y: 38, distance: '1.2 km', open: true,
  },
  {
    id: 'pp-balaju', name: 'PrimePasal Locker — Balaju', type: 'locker',
    area: 'Balaju, Kathmandu', address: 'Balaju Industrial Area, Gate 3',
    hours: '24/7 (automated)', slots: { total: 24, available: 6 }, sizes: ['S','M','L'],
    features: ['24/7 access', 'QR code unlock', 'SMS alert on arrival', 'Climate controlled'],
    x: 32, y: 30, distance: '4.8 km', open: true,
  },
  {
    id: 'pp-patan', name: 'PrimePasal Point — Patan', type: 'point',
    area: 'Mangalbazar, Lalitpur', address: 'Mangalbazar Road, near Patan Museum',
    hours: '10AM–7PM daily', slots: { total: 20, available: 0 }, sizes: ['S','M'],
    features: ['Staff assisted', 'Returns accepted'],
    x: 48, y: 58, distance: '3.4 km', open: true,
  },
  {
    id: 'pp-koteshwor', name: 'PrimePasal Locker — Koteshwor', type: 'locker',
    area: 'Koteshwor, Kathmandu', address: 'Koteshwor Chowk, near Ring Road',
    hours: '24/7 (automated)', slots: { total: 30, available: 18 }, sizes: ['S','M','L'],
    features: ['24/7 access', 'QR code unlock', 'SMS alert on arrival'],
    x: 68, y: 42, distance: '5.2 km', open: true,
  },
  {
    id: 'pp-boudha', name: 'PrimePasal Point — Boudha', type: 'point',
    area: 'Boudha, Kathmandu', address: 'Boudha Stupa Road, near Shechen Monastery',
    hours: '9AM–8PM daily', slots: { total: 16, available: 9 }, sizes: ['S','M'],
    features: ['Staff assisted', 'Returns accepted', 'CCTV 24/7'],
    x: 62, y: 30, distance: '6.1 km', open: true,
  },
  {
    id: 'pp-baneshwor', name: 'PrimePasal Hub — New Baneshwor', type: 'hub',
    area: 'New Baneshwor, Kathmandu', address: 'New Baneshwor, opposite Shree Plaza',
    hours: '8AM–9PM daily', slots: { total: 35, available: 22 }, sizes: ['S','M','L','XL'],
    features: ['Staff assisted', 'Refrigerated slots', 'Returns accepted', 'CCTV 24/7', 'Parking'],
    x: 55, y: 45, distance: '3.8 km', open: true,
  },
  {
    id: 'pp-bhaktapur', name: 'PrimePasal Point — Bhaktapur', type: 'point',
    area: 'Bhaktapur', address: 'Suryabinayak Road, Bhaktapur',
    hours: '10AM–6PM daily', slots: { total: 12, available: 7 }, sizes: ['S','M'],
    features: ['Staff assisted'],
    x: 82, y: 50, distance: '12.4 km', open: false,
  },
  {
    id: 'pp-naxal', name: 'PrimePasal Locker — Naxal', type: 'locker',
    area: 'Naxal, Kathmandu', address: 'Naxal, near Bhagwati Bahal',
    hours: '24/7 (automated)', slots: { total: 20, available: 14 }, sizes: ['S','M','L'],
    features: ['24/7 access', 'QR code unlock', 'SMS alert on arrival'],
    x: 50, y: 33, distance: '2.9 km', open: true,
  },
]

const TYPE_ICONS: Record<Locker['type'], string> = { hub: '🏢', locker: '📦', point: '📍' }
const TYPE_LABELS: Record<Locker['type'], string> = { hub: 'PrimePasal Hub', locker: 'Smart Locker', point: 'Pickup Point' }
const SIZE_LABELS: Record<string, string> = { S: 'Small\n≤2kg', M: 'Medium\n≤10kg', L: 'Large\n≤25kg', XL: 'Extra Large\n≤40kg' }

function AvailabilityBar({ slots }: { slots: Locker['slots'] }) {
  const pct = Math.round((slots.available / slots.total) * 100)
  const color = pct === 0 ? 'bg-red-400' : pct < 30 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{slots.available} slots free</span>
        <span>{slots.total} total</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function QRCodeSVG({ code }: { code: string }) {
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = Array.from({ length: 49 }, (_, i) => ((seed * (i + 1) * 7 + i * 13) % 3 !== 0))
  return (
    <svg viewBox="0 0 70 70" className="w-full" style={{ imageRendering: 'pixelated' }}>
      <rect width="70" height="70" fill="white" />
      {cells.map((on, i) => on && (
        <rect key={i} x={(i % 7) * 10} y={Math.floor(i / 7) * 10} width="10" height="10" fill="#1e1b4b" />
      ))}
      {/* Corner squares */}
      {[[0,0],[40,0],[0,40]].map(([x,y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width="30" height="30" fill="#1e1b4b" rx="2" />
          <rect x={x+5} y={y+5} width="20" height="20" fill="white" rx="1" />
          <rect x={x+10} y={y+10} width="10" height="10" fill="#1e1b4b" rx="1" />
        </g>
      ))}
    </svg>
  )
}

export default function PickupPointsPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | Locker['type']>('all')
  const [filterSize, setFilterSize] = useState<'all' | 'S' | 'M' | 'L' | 'XL'>('all')
  const [selected, setSelected] = useState<Locker | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const filtered = LOCKERS.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
        !l.area.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType !== 'all' && l.type !== filterType) return false
    if (filterSize !== 'all' && !l.sizes.includes(filterSize)) return false
    return true
  })

  const totalSlots     = LOCKERS.reduce((s, l) => s + l.slots.total, 0)
  const availableSlots = LOCKERS.reduce((s, l) => s + l.slots.available, 0)
  const openCount      = LOCKERS.filter(l => l.open).length

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#4C1D95] p-6 sm:p-10 text-white mb-8">
        <div className="relative z-10">
          <span className="inline-block bg-amber-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mb-3">📦 PrimePasal Locker Network</span>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">Pick Up When You Want</h1>
          <p className="text-white/70 text-sm sm:text-base mb-5 max-w-lg">
            8 locations across Kathmandu Valley. Smart lockers open 24/7. Free pickup — no missed deliveries.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <span className="font-black">{totalSlots}</span> <span className="text-white/70">total slots</span>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <span className="font-black text-green-300">{availableSlots}</span> <span className="text-white/70">available now</span>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <span className="font-black">{openCount}</span> <span className="text-white/70">locations open</span>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-6 text-[80px] opacity-10 font-black select-none">📦</div>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { step: '1', icon: '🛒', title: 'Order & select locker', desc: 'Choose a PrimePasal Locker at checkout as your delivery address' },
          { step: '2', icon: '📬', title: 'Package delivered', desc: 'We deliver to your chosen locker — usually same or next day' },
          { step: '3', icon: '📲', title: 'Get your QR code', desc: 'Receive SMS + app notification with your unique QR access code' },
          { step: '4', icon: '🔓', title: 'Scan & collect', desc: 'Visit anytime within 3 days, scan QR, door opens automatically' },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">{step}</div>
            <div>
              <p className="text-lg mb-0.5">{icon}</p>
              <p className="font-bold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">

        {/* Map + list left column */}
        <div className="lg:col-span-7 space-y-4">

          {/* SVG map */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Kathmandu Valley — Locker Map</h2>
              <span className="text-xs text-gray-400">{filtered.length} locations shown</span>
            </div>
            <div className="relative bg-violet-50" style={{ paddingTop: '65%' }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 65" preserveAspectRatio="none">
                {/* Valley outline (rough polygon) */}
                <polygon points="15,10 85,8 92,35 80,58 50,62 20,55 8,30" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="0.5" />
                {/* Roads */}
                <path d="M 20,35 Q 50,32 80,38" stroke="#ddd6fe" strokeWidth="0.8" fill="none" />
                <path d="M 42,10 L 48,62" stroke="#ddd6fe" strokeWidth="0.6" fill="none" />
                <path d="M 15,45 Q 55,42 85,48" stroke="#ddd6fe" strokeWidth="0.6" fill="none" />
                {/* Ring road */}
                <ellipse cx="50" cy="40" rx="26" ry="18" fill="none" stroke="#c4b5fd" strokeWidth="0.8" strokeDasharray="2 1" />
                {/* Labels */}
                <text x="40" y="18" fontSize="2.5" fill="#6d28d9" fontWeight="bold">Kathmandu</text>
                <text x="44" y="54" fontSize="2" fill="#7c3aed">Lalitpur</text>
                <text x="74" y="47" fontSize="2" fill="#7c3aed">Bhaktapur</text>
              </svg>

              {/* Locker pins */}
              {filtered.map(l => {
                const isSelected = selected?.id === l.id
                const availPct = l.slots.available / l.slots.total
                const pinColor = !l.open ? '#9ca3af' : l.slots.available === 0 ? '#ef4444' : availPct < 0.3 ? '#f59e0b' : '#7c3aed'
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l === selected ? null : l)}
                    className="absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110"
                    style={{ left: `${l.x}%`, top: `${l.y}%` }}
                    title={l.name}
                  >
                    <div className={`relative flex flex-col items-center`}>
                      <div
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 ${isSelected ? 'border-white scale-125' : 'border-transparent'}`}
                        style={{ backgroundColor: pinColor }}
                      >
                        {l.type === 'hub' ? '🏢' : l.type === 'locker' ? '🔒' : '📍'}
                      </div>
                      <div className="w-0.5 h-2 bg-gray-400" />
                      {isSelected && (
                        <div className="absolute bottom-full mb-1 bg-white rounded-xl shadow-xl border border-violet-200 px-2 py-1.5 text-[10px] font-bold text-gray-900 whitespace-nowrap z-10">
                          {l.name.split(' — ')[1] || l.name}
                          <br />
                          <span className={l.slots.available === 0 ? 'text-red-500' : 'text-green-600'}>
                            {l.slots.available === 0 ? 'Full' : `${l.slots.available} slots free`}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* Legend */}
              <div className="absolute bottom-2 right-2 bg-white/90 rounded-xl px-2 py-1.5 text-[9px] space-y-0.5 shadow">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-600 inline-block" /> Available</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Few slots</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Full</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Closed</div>
              </div>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or area…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value="all">All types</option>
              <option value="hub">Hub</option>
              <option value="locker">Smart Locker</option>
              <option value="point">Pickup Point</option>
            </select>
            <select value={filterSize} onChange={e => setFilterSize(e.target.value as typeof filterSize)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
              <option value="all">Any size</option>
              <option value="S">Small (≤2kg)</option>
              <option value="M">Medium (≤10kg)</option>
              <option value="L">Large (≤25kg)</option>
              <option value="XL">XL (≤40kg)</option>
            </select>
          </div>

          {/* Locker list */}
          <div className="space-y-3">
            {filtered.map(l => {
              const isSelected = selected?.id === l.id
              return (
                <div key={l.id}
                  onClick={() => setSelected(l === selected ? null : l)}
                  className={`bg-white border rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${isSelected ? 'border-violet-500 ring-1 ring-violet-300' : 'border-gray-100 hover:border-violet-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base">{TYPE_ICONS[l.type]}</span>
                        <span className="font-bold text-gray-900 text-sm">{l.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{TYPE_LABELS[l.type]}</span>
                        {!l.open && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Closed</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <FiMapPin className="text-violet-400 flex-shrink-0" />
                        <span>{l.address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3 flex-wrap">
                        <span className="flex items-center gap-1"><FiClock className="text-gray-400" /> {l.hours}</span>
                        {l.distance && <span className="flex items-center gap-1"><FiNavigation className="text-gray-400" /> {l.distance}</span>}
                        <span className="flex items-center gap-1"><FiPackage className="text-gray-400" /> Sizes: {l.sizes.join(' · ')}</span>
                      </div>
                      <AvailabilityBar slots={l.slots} />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black text-green-600">FREE</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">pickup</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Features</p>
                          <ul className="space-y-0.5">
                            {l.features.map(f => (
                              <li key={f} className="flex items-center gap-1 text-xs text-gray-700">
                                <FiCheck className="text-green-500 flex-shrink-0 text-[10px]" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Package Sizes</p>
                          <div className="grid grid-cols-2 gap-1">
                            {l.sizes.map(s => (
                              <div key={s} className="bg-violet-50 border border-violet-100 rounded-lg p-1.5 text-center">
                                <p className="text-xs font-black text-violet-700">{s}</p>
                                <p className="text-[9px] text-gray-500 leading-tight whitespace-pre-line">{SIZE_LABELS[s]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/checkout"
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2.5 rounded-xl text-center transition-colors">
                          Select this location
                        </Link>
                        <button onClick={e => { e.stopPropagation(); setShowQR(true) }}
                          className="flex items-center gap-1.5 border border-gray-200 hover:border-violet-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                          <FiSmartphone /> Sample QR
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <FiMapPin className="text-4xl mx-auto mb-3" />
                <p>No locations match your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-5 space-y-4">

          {/* Package size guide */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><FiPackage className="text-violet-500" /> Package Size Guide</h2>
            <div className="space-y-2">
              {[
                { size: 'S', dim: '20×15×10 cm', weight: '≤2 kg', example: 'Phone, watch, small book', color: 'bg-green-50 border-green-200' },
                { size: 'M', dim: '35×25×20 cm', weight: '≤10 kg', example: 'Shoes, clothing, tablet', color: 'bg-blue-50 border-blue-200' },
                { size: 'L', dim: '60×40×35 cm', weight: '≤25 kg', example: 'Laptop, small appliance', color: 'bg-violet-50 border-violet-200' },
                { size: 'XL', dim: '90×60×50 cm', weight: '≤40 kg', example: 'Monitor, large electronics', color: 'bg-amber-50 border-amber-200' },
              ].map(({ size, dim, weight, example, color }) => (
                <div key={size} className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-current flex items-center justify-center font-black text-base flex-shrink-0" style={{ borderColor: 'currentColor' }}>
                    {size}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900">{dim} · {weight}</p>
                    <p className="text-[11px] text-gray-500">{example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Network Availability</h2>
            <div className="space-y-2">
              {LOCKERS.filter(l => l.open).sort((a, b) => b.slots.available - a.slots.available).map(l => {
                const pct = Math.round((l.slots.available / l.slots.total) * 100)
                const color = pct === 0 ? 'text-red-600' : pct < 30 ? 'text-amber-600' : 'text-green-600'
                return (
                  <div key={l.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2"
                    onClick={() => setSelected(l)}>
                    <span className="text-base flex-shrink-0">{TYPE_ICONS[l.type]}</span>
                    <span className="flex-1 text-xs font-medium text-gray-700 truncate">{l.name.split(' — ')[1]}</span>
                    <span className={`text-xs font-black flex-shrink-0 ${color}`}>
                      {l.slots.available === 0 ? 'FULL' : `${l.slots.available}/${l.slots.total}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: 'How do I access my locker?', a: 'After your package is delivered, you\'ll receive an SMS and app notification with a unique QR code. Just scan it at the locker to open the door.' },
                { q: 'How long is my package held?', a: 'Packages are held for 3 days. After that, the package is returned to the sender and you\'ll receive a refund.' },
                { q: 'What if the locker is full?', a: 'We\'ll automatically assign the nearest available locker with space. You\'ll always be notified before delivery.' },
                { q: 'Can I return items at a locker?', a: 'Yes! Hub and Point locations accept returns. Just bring your original packaging and order ID.' },
                { q: 'Is there a charge for locker pickup?', a: 'Locker pickup is always FREE on PrimePasal, regardless of your order size.' },
              ].map(({ q, a }, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-left">
                    <span>{q}</span>
                    <FiChevronDown className={`flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">{a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white text-center">
            <p className="font-black text-lg mb-1">New locker coming soon!</p>
            <p className="text-white/70 text-sm mb-3">Pokhara · Butwal · Birgunj expansion by Q3 2026</p>
            <button className="bg-white text-violet-700 font-bold text-sm px-5 py-2 rounded-full hover:bg-violet-50 transition-colors">
              Notify me
            </button>
          </div>
        </div>
      </div>

      {/* QR code modal */}
      {showQR && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowQR(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl max-w-xs mx-auto text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Your Locker Access Code</p>
            <p className="font-black text-gray-900 text-lg mb-4">Order #PP-7831</p>
            <div className="w-40 mx-auto mb-4">
              <QRCodeSVG code="PP-7831-LOCKER-TH01" />
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="font-mono font-black text-xl tracking-widest text-violet-700">8 4 7 2</p>
              <p className="text-xs text-gray-500 mt-1">Manual entry code (if QR fails)</p>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5 mb-4">
              <p>📍 PrimePasal Hub — Thamel</p>
              <p>🔓 Locker #T-14 · Door B</p>
              <p>⏰ Expires in <strong>2d 14h 22m</strong></p>
            </div>
            <button onClick={() => setShowQR(false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm">
              Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}
