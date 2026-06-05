'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiRefreshCw, FiMessageSquare, FiBook, FiTrendingUp, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi'

interface Metrics { totalTickets:number; openTickets:number; resolvedTickets:number; avgCsat:string; avgResponseHrs:number|null; resolutionRate:number; byCategory:{_id:string;count:number}[] }
interface Article { _id:string; title:string; category:string; views:number; isPublished:boolean }

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab]           = useState<'metrics'|'articles'>('metrics')
  const [metrics, setMetrics]   = useState<Metrics|null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)

  // Article form
  const [showForm, setShowForm]       = useState(false)
  const [editArticle, setEditArticle] = useState<Article|null>(null)
  const [form, setForm]               = useState({ title:'', body:'', category:'orders', tags:'' })
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') { router.push('/login'); return }
  }, [user, authLoading, router])

  const fetchMetrics = useCallback(async () => {
    try { const r = await axios.get('/api/admin/support/metrics'); setMetrics(r.data.data) } catch {}
  }, [])

  const fetchArticles = useCallback(async () => {
    try { const r = await axios.get('/api/support/articles?limit=50'); setArticles(r.data.data || []) } catch {}
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    setLoading(true)
    Promise.all([fetchMetrics(), fetchArticles()]).finally(() => setLoading(false))
  }, [fetchMetrics, fetchArticles, user])

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editArticle) {
        await axios.put(`/api/support/articles/${editArticle._id}`, { ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) })
        toast.success('Article updated')
      } else {
        await axios.post('/api/support/articles', { ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) })
        toast.success('Article created')
      }
      setShowForm(false); setEditArticle(null); setForm({ title:'', body:'', category:'orders', tags:'' })
      fetchArticles()
    } catch { toast.error('Failed to save') }
    finally  { setSaving(false) }
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article?')) return
    await axios.delete(`/api/support/articles/${id}`)
    toast.success('Deleted')
    fetchArticles()
  }

  function openEdit(a: Article) {
    setEditArticle(a)
    setForm({ title: a.title, body: '', category: a.category, tags: '' })
    setShowForm(true)
  }

  async function seedSupport() {
    try { const r = await axios.post('/api/seed/support'); toast.success(r.data.message); fetchArticles(); fetchMetrics() }
    catch (e: unknown) { toast.error((e as {response?:{data?:{error?:string}}})?.response?.data?.error || 'Seed failed') }
  }

  if (authLoading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Support Admin</h1>
        <div className="flex gap-2">
          <button onClick={seedSupport} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Seed Demo Data</button>
          <button onClick={() => { fetchMetrics(); fetchArticles() }} className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
            <FiRefreshCw className="text-xs"/> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['metrics','articles'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize flex items-center gap-1.5 ${tab===t?'bg-indigo-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            {t === 'metrics' ? <><FiTrendingUp/>Metrics</> : <><FiBook/>Help Articles</>}
          </button>
        ))}
      </div>

      {/* ══ METRICS ══ */}
      {tab === 'metrics' && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Total Tickets',     value: metrics.totalTickets },
              { label:'Open Tickets',      value: metrics.openTickets },
              { label:'Resolution Rate',   value: metrics.resolutionRate + '%' },
              { label:'Avg CSAT',          value: metrics.avgCsat + ' / 5' },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-4">
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {metrics.avgResponseHrs && (
            <div className="bg-white border rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Avg First Response Time</p>
              <p className="text-2xl font-black text-indigo-600">{metrics.avgResponseHrs}h</p>
            </div>
          )}
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Tickets by Category</p>
            <div className="space-y-2">
              {metrics.byCategory.map(c => {
                const pct = metrics.totalTickets > 0 ? Math.round(c.count / metrics.totalTickets * 100) : 0
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 capitalize w-24">{c._id}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }}/>
                    </div>
                    <p className="text-xs text-gray-500 w-8 text-right">{c.count}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ ARTICLES ══ */}
      {tab === 'articles' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setEditArticle(null); setForm({ title:'', body:'', category:'orders', tags:'' }); setShowForm(true) }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">
              <FiPlus/> New Article
            </button>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><FiBook className="text-4xl mx-auto mb-2"/><p>No articles yet. Click "Seed Demo Data" to add sample articles.</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Title','Category','Views','Actions'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articles.map(a => (
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="text-xs font-medium text-gray-900">{a.title}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-500 capitalize">{a.category}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.views}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(a)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"><FiEdit2/>Edit</button>
                          <button onClick={() => deleteArticle(a._id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"><FiTrash2/>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Article Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-900">{editArticle ? 'Edit Article' : 'New Help Article'}</h2>
              <button onClick={() => setShowForm(false)}><FiX className="text-gray-400"/></button>
            </div>
            <form onSubmit={saveArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['orders','payments','shipping','returns','account','general'].map(c=>(<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body (Markdown)</label>
                <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}
                  placeholder="## Title\n\nWrite your article content here..."
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  required={!editArticle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}
                  placeholder="order, track, shipping"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold">
                  {saving ? 'Saving...' : editArticle ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
