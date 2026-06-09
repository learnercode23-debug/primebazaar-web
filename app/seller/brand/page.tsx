'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { FiSave, FiExternalLink, FiImage, FiType, FiAlignLeft } from 'react-icons/fi'

export default function SellerBrandPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    brandName: '',
    tagline: '',
    story: '',
    logoUrl: '',
    bannerUrl: '',
    websiteUrl: '',
    contactEmail: '',
    features: ['', '', ''],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) {
      router.push('/')
    }
  }, [user, loading, router])

  function setFeature(i: number, val: string) {
    setForm(f => { const ff = [...f.features]; ff[i] = val; return { ...f, features: ff } })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // In production this POSTs to /api/seller/brand
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    toast.success('Brand page saved!')
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading || !user) return null

  const previewSlug = encodeURIComponent(form.brandName || user.name)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Brand Store Editor</h1>
          <p className="text-sm text-gray-500">Create your A+ brand page visible to all customers</p>
        </div>
        {form.brandName && (
          <Link href={`/brand/${previewSlug}`} target="_blank"
            className="flex items-center gap-2 border border-violet-300 text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <FiExternalLink /> Preview store
          </Link>
        )}
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Brand identity */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-900 flex items-center gap-2"><FiType /> Brand Identity</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand name *</label>
              <input required value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
                placeholder="e.g. Sony, Nike, Local Brand" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tagline</label>
              <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. Quality you can trust" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Website URL</label>
              <input type="url" value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://yourbrand.com" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact email</label>
              <input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="support@yourbrand.com" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-900 flex items-center gap-2"><FiImage /> Images</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Logo URL (square, PNG/SVG)</label>
              <input type="url" value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="logo preview" className="mt-2 w-16 h-16 object-contain rounded-xl border" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Banner URL (16:9, 1200×675px)</label>
              <input type="url" value={form.bannerUrl} onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))}
                placeholder="https://..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              {form.bannerUrl && (
                <img src={form.bannerUrl} alt="banner preview" className="mt-2 w-full h-24 object-cover rounded-xl border" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          </div>
        </div>

        {/* Brand story */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-900 flex items-center gap-2"><FiAlignLeft /> Brand Story</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">About your brand (shown on brand page)</label>
            <textarea value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
              rows={5} placeholder="Tell customers who you are, what you stand for, and why they should trust your products…"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Key features / USPs (up to 3)</label>
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <input key={i} value={f} onChange={e => setFeature(i, e.target.value)}
                  placeholder={`Feature ${i + 1} — e.g. 5-year warranty`}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-full transition-colors shadow-md">
          <FiSave /> {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save brand page'}
        </button>
      </form>
    </div>
  )
}
