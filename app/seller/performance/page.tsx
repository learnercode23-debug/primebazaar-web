'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi'

const METRICS = [
  { label: 'Order Defect Rate',      value: 0.8,  target: '<1%',  unit: '%', good: true,  desc: 'Orders with A-to-Z claims, chargebacks, or negative feedback' },
  { label: 'Cancellation Rate',      value: 2.1,  target: '<2.5%',unit: '%', good: true,  desc: 'Pre-shipment order cancellations by seller' },
  { label: 'Late Shipment Rate',     value: 3.4,  target: '<4%',  unit: '%', good: true,  desc: 'Orders shipped after the expected ship date' },
  { label: 'Valid Tracking Rate',    value: 94.2, target: '>95%', unit: '%', good: false, desc: 'Orders with valid tracking numbers uploaded on time' },
  { label: 'Customer Response Time', value: 18,   target: '<24h', unit: 'h', good: true,  desc: 'Avg time to respond to buyer messages' },
  { label: 'Return Dissatisfaction', value: 1.4,  target: '<10%', unit: '%', good: true,  desc: 'Returns where buyer reported a problem' },
]

const HEALTH_SCORE = 82

function Gauge({ score }: { score: number }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'At Risk'
  const angle = (score / 100) * 180 - 90
  const r = 70
  const cx = 90; const cy = 90
  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  })
  const start = toXY(-180); const end = toXY(0)
  const active = toXY(angle - 90)
  const largeArc = score > 50 ? 1 : 0

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-48">
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${active.x} ${active.y}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="900" fill={color}>{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6b7280">{label}</text>
      </svg>
      <p className="font-black text-lg text-gray-900 -mt-2">Account Health Score</p>
      <p className="text-sm text-gray-500">Updated daily · 100 = perfect</p>
    </div>
  )
}

export default function SellerPerformancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) router.push('/')
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/seller" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> Seller Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <FiTrendingUp className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Performance Scorecard</h1>
          <p className="text-sm text-gray-500">Your seller account health and metrics</p>
        </div>
      </div>

      {/* Health gauge */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6 flex flex-col items-center">
        <Gauge score={HEALTH_SCORE} />
        <div className="flex gap-6 mt-4 text-xs text-center">
          {[['🟢 80–100','Good Standing'],['🟡 60–79','Needs Attention'],['🔴 0–59','At Risk']].map(([range, label]) => (
            <div key={label as string}><p className="font-bold text-gray-700">{range as string}</p><p className="text-gray-500">{label as string}</p></div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {METRICS.map(({ label, value, target, unit, good, desc }) => (
          <div key={label} className={`bg-white border rounded-2xl p-5 shadow-sm ${good ? 'border-gray-100' : 'border-amber-300'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-0.5">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              {good
                ? <FiCheckCircle className="text-green-500 text-lg flex-shrink-0" />
                : <FiAlertCircle className="text-amber-500 text-lg flex-shrink-0" />
              }
            </div>
            <div className="flex items-end justify-between mt-3">
              <p className={`text-3xl font-black ${good ? 'text-gray-900' : 'text-amber-600'}`}>{value}{unit}</p>
              <p className="text-sm text-gray-500">Target: <strong>{target}</strong></p>
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${good ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${good ? Math.min(95, (value / parseFloat(target)) * 100) : Math.min(95, (value / 100) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
        <h2 className="font-black text-gray-900 mb-3">💡 Improvement Tips</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2"><FiAlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" /> <span><strong>Valid Tracking Rate is below target.</strong> Upload tracking numbers within 24h of shipping to stay compliant.</span></li>
          <li className="flex gap-2"><FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" /> <span>Your Cancellation Rate is excellent — keep inventory updated to avoid overselling.</span></li>
          <li className="flex gap-2"><FiCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" /> <span>Response time is within the 24-hour window. Aim for under 12 hours to boost your score.</span></li>
        </ul>
      </div>

      {/* Historical trend */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-4">
        <h2 className="font-black text-gray-900 mb-3">Score History (6 months)</h2>
        <div className="flex items-end gap-3 h-20">
          {[68, 72, 75, 78, 80, 82].map((score, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg" style={{ height: `${(score / 100) * 72}px`, background: score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626' }} />
              <span className="text-[10px] text-gray-500">{['Jan','Feb','Mar','Apr','May','Jun'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
