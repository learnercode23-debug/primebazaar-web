'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiRefreshCw, FiCheck, FiX, FiMapPin, FiCamera, FiClock, FiAlertTriangle } from 'react-icons/fi'
import Image from 'next/image'

interface Proof {
  _id:   string
  order: { _id: string; orderNumber: string; totalAmount: number; shippingAddress: { name: string; street: string; city: string }; user: { name?: string }; deliveredAt?: string }
  agent: { name: string; email: string }
  photoUrl: string
  capturedAt: string
  latitude?: number
  longitude?: number
  locationFlagged: boolean
  otpVerified: boolean
  recipientName?: string
  confirmationStatus: string
  disputeReason?: string
  createdAt: string
}
interface Counts { pending: number; confirmed: number; disputed: number }

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  disputed:  'bg-red-100 text-red-700',
}

export default function SellerDeliveriesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [proofs,    setProofs]   = useState<Proof[]>([])
  const [counts,    setCounts]   = useState<Counts>({ pending: 0, confirmed: 0, disputed: 0 })
  const [loading,   setLoading]  = useState(true)
  const [statusTab, setStatusTab]= useState('pending')
  const [selected,  setSelected] = useState<Proof | null>(null)
  const [dispute,   setDispute]  = useState('')
  const [acting,    setActing]   = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (user.role !== 'seller' && user.role !== 'admin') { router.push('/'); return }
  }, [user, authLoading, router])

  const fetchProofs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/seller/deliveries?status=${statusTab}`)
      setProofs(res.data.data || [])
      setCounts(res.data.counts || { pending: 0, confirmed: 0, disputed: 0 })
    } catch { toast.error('Failed to load deliveries') }
    finally  { setLoading(false) }
  }, [statusTab])

  useEffect(() => { if (user) fetchProofs() }, [fetchProofs, user])

  async function handleConfirm(proof: Proof) {
    setActing(true)
    try {
      await axios.patch(`/api/delivery-proof/${proof._id}/confirm`)
      toast.success('Delivery confirmed!')
      setSelected(null)
      fetchProofs()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Failed')
    } finally { setActing(false) }
  }

  async function handleDispute(proof: Proof) {
    if (!dispute.trim()) { toast.error('Please enter a reason'); return }
    setActing(true)
    try {
      await axios.patch(`/api/delivery-proof/${proof._id}/dispute`, { reason: dispute })
      toast.success('Dispute raised')
      setSelected(null)
      setDispute('')
      fetchProofs()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Failed')
    } finally { setActing(false) }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Delivery Proof Confirmations</h1>
          <p className="text-sm text-gray-500">Review photo proofs before confirming deliveries</p>
        </div>
        <button onClick={fetchProofs} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <FiRefreshCw className="text-xs"/> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1">
        {[
          { key: 'pending',   label: `Pending (${counts.pending})`,   color: 'bg-yellow-500' },
          { key: 'confirmed', label: `Confirmed (${counts.confirmed})`,color: 'bg-green-500' },
          { key: 'disputed',  label: `Disputed (${counts.disputed})`,  color: 'bg-red-500' },
          { key: 'all',       label: 'All', color: 'bg-gray-500' },
        ].map(t => (
          <button key={t.key} onClick={() => setStatusTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusTab===t.key?`${t.color} text-white`:'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Proof cards */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : proofs.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <FiCamera className="text-4xl mx-auto mb-2"/>
          <p className="font-medium">No {statusTab} deliveries</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proofs.map(proof => (
            <div key={proof._id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelected(proof); setDispute('') }}>

              {/* Proof photo */}
              <div className="relative aspect-video bg-gray-100">
                <Image src={proof.photoUrl} alt="Delivery proof" fill className="object-cover"/>
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[proof.confirmationStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {proof.confirmationStatus}
                  </span>
                </div>
                {proof.locationFlagged && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full">
                    <FiAlertTriangle className="text-xs"/> GPS not provided
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <p className="font-mono text-xs font-bold text-gray-900">#{proof.order?.orderNumber}</p>
                <p className="text-xs text-gray-600">{proof.order?.shippingAddress?.name} · {proof.order?.shippingAddress?.city}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FiClock/>{new Date(proof.capturedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {proof.otpVerified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">OTP ✓</span>}
                  {proof.recipientName && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{proof.recipientName}</span>}
                  {proof.latitude && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><FiMapPin/>GPS</span>}
                </div>
                {proof.confirmationStatus === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={e=>{e.stopPropagation();handleConfirm(proof)}} disabled={acting}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                      <FiCheck/> Confirm
                    </button>
                    <button onClick={e=>{e.stopPropagation();setSelected(proof);setDispute('')}}
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-red-100">
                      <FiX/> Dispute
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ Detail Modal ══ */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Photo */}
            <div className="relative aspect-video bg-gray-100">
              <Image src={selected.photoUrl} alt="Delivery proof" fill className="object-cover rounded-t-2xl"/>
              <button onClick={() => setSelected(null)}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70">
                <FiX/>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Order info */}
              <div>
                <p className="font-bold text-gray-900">Order #{selected.order?.orderNumber}</p>
                <p className="text-sm text-gray-500">{selected.order?.shippingAddress?.name}, {selected.order?.shippingAddress?.street}, {selected.order?.shippingAddress?.city}</p>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Captured At</p>
                  <p className="text-sm font-medium">{new Date(selected.capturedAt).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Agent</p>
                  <p className="text-sm font-medium">{selected.agent?.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">OTP Verified</p>
                  <p className={`text-sm font-bold ${selected.otpVerified ? 'text-green-600' : 'text-red-500'}`}>
                    {selected.otpVerified ? '✓ Yes' : '✗ No'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">GPS</p>
                  {selected.latitude ? (
                    <a href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="text-sm font-medium text-blue-600 underline flex items-center gap-1">
                      <FiMapPin/> View on map
                    </a>
                  ) : (
                    <p className="text-sm text-red-500">Not provided ⚠️</p>
                  )}
                </div>
              </div>

              {selected.recipientName && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Recipient Name</p>
                  <p className="text-sm font-medium">{selected.recipientName}</p>
                </div>
              )}

              {selected.locationFlagged && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  <FiAlertTriangle/> GPS coordinates were not captured — verify delivery carefully.
                </div>
              )}

              {selected.confirmationStatus === 'disputed' && selected.disputeReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-400">Dispute Reason</p>
                  <p className="text-sm text-red-700">{selected.disputeReason}</p>
                </div>
              )}

              {/* Actions */}
              {selected.confirmationStatus === 'pending' && (
                <div className="space-y-3">
                  <button onClick={() => handleConfirm(selected)} disabled={acting}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                    <FiCheck/> {acting ? 'Confirming...' : 'Confirm Delivery'}
                  </button>
                  <div>
                    <textarea value={dispute} onChange={e => setDispute(e.target.value)}
                      placeholder="Dispute reason (required if disputing)..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-2"/>
                    <button onClick={() => handleDispute(selected)} disabled={acting || !dispute.trim()}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                      <FiX/> {acting ? 'Submitting...' : 'Raise Dispute'}
                    </button>
                  </div>
                </div>
              )}
              {selected.confirmationStatus === 'confirmed' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 font-medium">
                  <FiCheck/> Delivery confirmed
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
