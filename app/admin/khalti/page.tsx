'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { FiRefreshCw, FiCheck, FiX, FiUpload, FiEye } from 'react-icons/fi'

interface KhaltiOrder {
  _id: string; orderNumber: string; totalAmount: number; createdAt: string
  khaltiTransactionId: string; khaltiVerificationStatus: string
  khaltiRejectionReason?: string; khaltiVerifiedAt?: string
  user: { name: string; email: string; phone?: string }
  items: Array<{ title: string; quantity: number }>
  khaltiVerifiedBy?: { name: string }
}
interface Counts { pending: number; verified: number; rejected: number }
interface Setting { khaltiQrImageUrl: string; khaltiPhoneNumber: string; khaltiAccountName: string; isKhaltiQrEnabled: boolean }

export default function AdminKhaltiPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab,     setTab]     = useState<'pending'|'verified'|'rejected'|'settings'>('pending')
  const [orders,  setOrders]  = useState<KhaltiOrder[]>([])
  const [counts,  setCounts]  = useState<Counts>({ pending:0, verified:0, rejected:0 })
  const [setting, setSetting] = useState<Setting|null>(null)
  const [loading, setLoading] = useState(true)

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<KhaltiOrder|null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [acting,       setActing]       = useState(false)

  // QR upload
  const fileRef     = useRef<HTMLInputElement>(null)
  const [qrPreview, setQrPreview]  = useState<string|null>(null)
  const [qrBase64,  setQrBase64]   = useState<string|null>(null)
  const [phoneNum,  setPhoneNum]   = useState('')
  const [acctName,  setAcctName]   = useState('')
  const [savingQR,  setSavingQR]   = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') router.push('/login')
  }, [user, authLoading, router])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const status = tab === 'settings' ? 'all' : tab
      const [ordRes, setRes] = await Promise.all([
        axios.get(`/api/admin/khalti/pending?status=${status}`),
        axios.get('/api/payment/khalti-qr'),
      ])
      setOrders(ordRes.data.data || [])
      setCounts(ordRes.data.counts || { pending:0, verified:0, rejected:0 })
      const s = setRes.data.data
      setSetting(s)
      setPhoneNum(s?.khaltiPhoneNumber || '')
      setAcctName(s?.khaltiAccountName || '')
    } catch { toast.error('Failed to load') }
    finally  { setLoading(false) }
  }, [tab])

  useEffect(() => { if (user?.role === 'admin') fetchOrders() }, [fetchOrders, user])

  async function handleVerify(order: KhaltiOrder) {
    setActing(true)
    try {
      await axios.patch(`/api/admin/orders/${order._id}/verify-khalti`)
      toast.success('✅ Payment verified — order confirmed!')
      fetchOrders()
    } catch (e: unknown) {
      toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Failed')
    } finally { setActing(false) }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setActing(true)
    try {
      await axios.patch(`/api/admin/orders/${rejectTarget._id}/reject-khalti`, { reason: rejectReason })
      toast.success('Payment rejected')
      setRejectTarget(null); setRejectReason('')
      fetchOrders()
    } catch { toast.error('Failed') }
    finally  { setActing(false) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      setQrBase64(b64)
      setQrPreview(URL.createObjectURL(file))
    }
    reader.readAsDataURL(file)
  }

  async function saveQR() {
    setSavingQR(true)
    try {
      await axios.post('/api/payment/khalti-qr', {
        imageBase64: qrBase64 || undefined,
        phoneNumber: phoneNum,
        accountName: acctName,
      })
      toast.success('QR settings saved!')
      setQrBase64(null); setQrPreview(null)
      fetchOrders()
    } catch { toast.error('Save failed') }
    finally  { setSavingQR(false) }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Khalti QR Payments</h1>
          <p className="text-sm text-gray-500">Manual payment verification dashboard</p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <FiRefreshCw className="text-xs"/> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {[
          { key:'pending',  label:`Pending (${counts.pending})`,   color:'bg-yellow-500' },
          { key:'verified', label:`Verified (${counts.verified})`,  color:'bg-green-500' },
          { key:'rejected', label:`Rejected (${counts.rejected})`,  color:'bg-red-500' },
          { key:'settings', label:'QR Settings',                    color:'bg-indigo-500' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab===t.key?`${t.color} text-white`:'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ ORDERS ══ */}
      {tab !== 'settings' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No {tab} payments</div>
          ) : (
            <div className="divide-y">
              {orders.map(order => (
                <div key={order._id} className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-mono text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.khaltiVerificationStatus==='pending_verification'?'bg-yellow-100 text-yellow-700':
                          order.khaltiVerificationStatus==='verified'?'bg-green-100 text-green-700':
                          'bg-red-100 text-red-700'
                        }`}>{order.khaltiVerificationStatus?.replace('_',' ')}</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{order.user?.name} — <span className="text-gray-500">{order.user?.email}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(order.items||[]).slice(0,2).map(i=>`${i.quantity}× ${i.title}`).join(', ')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
                          <p className="text-xs text-gray-500">Transaction ID</p>
                          <p className="font-mono text-sm font-bold text-indigo-800">{order.khaltiTransactionId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-bold text-green-700">Rs.{order.totalAmount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-xs text-gray-600">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        {order.khaltiVerifiedBy && (
                          <div>
                            <p className="text-xs text-gray-500">Verified by</p>
                            <p className="text-xs text-gray-600">{order.khaltiVerifiedBy.name}</p>
                          </div>
                        )}
                        {order.khaltiRejectionReason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-red-500">Reason: {order.khaltiRejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.khaltiVerificationStatus === 'pending_verification' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleVerify(order)} disabled={acting}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-sm">
                          <FiCheck/> Verify
                        </button>
                        <button onClick={() => { setRejectTarget(order); setRejectReason('') }}
                          className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 font-bold px-4 py-2 rounded-xl text-sm hover:bg-red-100">
                          <FiX/> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6 space-y-5">
            <h2 className="font-bold text-gray-900">Khalti QR Code Settings</h2>

            {/* Current QR */}
            {setting?.khaltiQrImageUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Current QR Code:</p>
                <Image src={setting.khaltiQrImageUrl} alt="Khalti QR" width={200} height={200} className="rounded-xl border border-gray-200"/>
                <p className="text-xs text-gray-500 mt-1">{setting.khaltiAccountName} · {setting.khaltiPhoneNumber}</p>
              </div>
            )}

            {/* Upload new QR */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Update QR Image:</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-700 transition-all">
                <FiUpload/> Click to upload QR image
              </button>
              {qrPreview && (
                <div className="mt-2">
                  <Image src={qrPreview} alt="Preview" width={150} height={150} className="rounded-xl border border-indigo-200"/>
                  <p className="text-xs text-gray-500 mt-1">New QR preview</p>
                </div>
              )}
            </div>

            {/* Account info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input value={acctName} onChange={e=>setAcctName(e.target.value)}
                  placeholder="Randhir Sah"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khalti Number</label>
                <input value={phoneNum} onChange={e=>setPhoneNum(e.target.value)}
                  placeholder="9801772670"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>

            <button onClick={saveQR} disabled={savingQR}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
              {savingQR ? 'Saving…' : 'Save QR Settings'}
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-yellow-800 mb-1">⚠️ How to verify payments</p>
            <p className="text-yellow-700">When a customer pays, open your Khalti app → Transactions → find the transaction ID they entered. If it matches the amount, click Verify. If not, click Reject.</p>
          </div>
        </div>
      )}

      {/* ══ Reject Modal ══ */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-gray-900 mb-4">Reject Payment</h2>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium">#{rejectTarget.orderNumber}</p>
              <p className="text-xs text-gray-500">TXN: {rejectTarget.khaltiTransactionId}</p>
              <p className="text-xs text-gray-500">Rs.{rejectTarget.totalAmount?.toLocaleString()} · {rejectTarget.user?.name}</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection (required)</label>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID not found in Khalti app, amount mismatch..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"/>
            <div className="flex gap-3">
              <button onClick={()=>setRejectTarget(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()||acting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                {acting?'Rejecting…':'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
