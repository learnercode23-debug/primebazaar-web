'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiGift, FiCheck, FiCopy } from 'react-icons/fi'

const AMOUNTS = [500, 1000, 2000, 5000]
const DESIGNS = [
  { id: 'birthday',   label: '🎂 Birthday',   bg: 'from-pink-400 to-rose-500' },
  { id: 'celebration',label: '🎉 Celebration', bg: 'from-violet-500 to-indigo-600' },
  { id: 'thank-you',  label: '🙏 Thank You',   bg: 'from-amber-400 to-orange-500' },
  { id: 'diwali',     label: '🪔 Dashain',     bg: 'from-green-500 to-teal-600' },
]

export default function GiftCardsPage() {
  const [amount, setAmount]     = useState(1000)
  const [design, setDesign]     = useState(DESIGNS[0])
  const [recipientName, setRecipientName]   = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [senderName, setSenderName]         = useState('')
  const [message, setMessage]               = useState('')
  const [purchased, setPurchased]           = useState(false)
  const [code, setCode]                     = useState('')
  const [copied, setCopied]                 = useState(false)
  const [buying, setBuying]                 = useState(false)
  const [redeemCode, setRedeemCode]         = useState('')
  const [redeeming, setRedeeming]           = useState(false)

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault()
    setBuying(true)
    try {
      const r = await axios.post('/api/gift-cards', { amount, design: design.id, recipientName, recipientEmail, senderName, message })
      setCode(r.data.data.code)
      setPurchased(true)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to purchase gift card')
    } finally {
      setBuying(false)
    }
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) return
    setRedeeming(true)
    try {
      const r = await axios.post('/api/gift-cards/redeem', { code: redeemCode })
      toast.success(`Rs.${r.data.data.credited.toLocaleString()} added! Store credit balance: Rs.${r.data.data.storeCredit.toLocaleString()}`)
      setRedeemCode('')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not redeem code')
    } finally {
      setRedeeming(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (purchased) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheck className="text-green-600 text-2xl" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Gift card sent! 🎉</h1>
        <p className="text-gray-600 mb-6 text-sm">
          We&apos;ve sent a Rs.{amount.toLocaleString()} gift card to <strong>{recipientEmail}</strong>.
        </p>

        {/* Gift card preview */}
        <div className={`bg-gradient-to-br ${design.bg} text-white rounded-2xl p-6 mb-6 text-left shadow-xl`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="font-black text-xl">PrimePasal</p>
              <p className="text-white/80 text-xs">Gift Card</p>
            </div>
            <FiGift className="text-3xl text-white/80" />
          </div>
          <p className="text-3xl font-black mb-1">Rs.{amount.toLocaleString()}</p>
          <p className="text-white/80 text-sm mb-4">For {recipientName}</p>
          <div className="bg-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="font-mono font-bold text-sm tracking-widest">{code}</span>
            <button onClick={copy} className="text-white/80 hover:text-white ml-2 transition-colors">
              {copied ? <FiCheck /> : <FiCopy />}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-6">
          Redeem by entering this code at checkout under &quot;Apply coupon / gift card&quot;
        </p>
        <Link href="/products" className="inline-block bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-full transition-colors text-sm">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FiGift className="text-violet-600 text-2xl" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Gift Cards</h1>
        <p className="text-gray-600">The perfect gift for any occasion. Delivered by email instantly.</p>
      </div>

      <form onSubmit={handlePurchase} className="grid lg:grid-cols-2 gap-8">
        {/* Left: customise */}
        <div className="space-y-6">
          {/* Amount */}
          <div>
            <p className="font-bold text-gray-900 mb-3">Choose amount</p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${amount === a ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  Rs.{a >= 1000 ? (a / 1000) + 'K' : a}
                </button>
              ))}
            </div>
          </div>

          {/* Design */}
          <div>
            <p className="font-bold text-gray-900 mb-3">Choose design</p>
            <div className="grid grid-cols-2 gap-2">
              {DESIGNS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDesign(d)}
                  className={`h-14 rounded-xl bg-gradient-to-r ${d.bg} flex items-center justify-center text-white font-bold text-sm transition-all ${design.id === d.id ? 'ring-4 ring-violet-600 ring-offset-2' : 'opacity-70 hover:opacity-90'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className="font-bold text-gray-900 mb-3">Recipient details</p>
            <div className="space-y-3">
              <input required value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient's name" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <input required type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient's email" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <input required value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Your name" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Personal message (optional)" rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
            </div>
          </div>
        </div>

        {/* Right: preview + buy */}
        <div className="space-y-6">
          {/* Preview */}
          <div>
            <p className="font-bold text-gray-900 mb-3">Preview</p>
            <div className={`bg-gradient-to-br ${design.bg} text-white rounded-2xl p-6 shadow-xl`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="font-black text-xl">PrimePasal</p>
                  <p className="text-white/80 text-xs">Gift Card</p>
                </div>
                <FiGift className="text-3xl text-white/60" />
              </div>
              <p className="text-3xl font-black mb-1">Rs.{amount.toLocaleString()}</p>
              <p className="text-white/80 text-sm">
                {recipientName ? `For ${recipientName}` : 'For someone special'}
                {senderName && ` · From ${senderName}`}
              </p>
              {message && <p className="text-white/70 text-xs mt-2 italic">&ldquo;{message}&rdquo;</p>}
            </div>
          </div>

          {/* Summary + buy */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Gift card value</span>
              <span className="font-bold">Rs.{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-600">Delivery fee</span>
              <span className="text-green-600 font-bold">Free (email)</span>
            </div>
            <div className="flex justify-between font-black text-base mb-5 border-t pt-3">
              <span>Total</span>
              <span>Rs.{amount.toLocaleString()}</span>
            </div>
            <button
              type="submit"
              disabled={buying}
              className="w-full bg-amazon-yellow hover:bg-yellow-400 disabled:opacity-60 text-gray-900 font-black py-3 rounded-full text-sm transition-colors"
            >
              {buying ? 'Processing…' : `Buy Gift Card — Rs.${amount.toLocaleString()}`}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Emailed instantly · Valid for 1 year · No expiry fees
            </p>
          </div>

          {/* Redeem section */}
          <div className="border border-gray-200 rounded-2xl p-4">
            <p className="font-bold text-sm text-gray-900 mb-1">Have a gift card to redeem?</p>
            <p className="text-xs text-gray-500 mb-3">Add it to your store credit — it applies automatically at checkout.</p>
            <div className="flex gap-2">
              <input value={redeemCode} onChange={e => setRedeemCode(e.target.value)} placeholder="PP-XXXX-XXXX"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-400" />
              <button type="button" onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {redeeming ? '…' : 'Redeem'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
