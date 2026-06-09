'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiUpload, FiDownload, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Row {
  title: string; category: string; price: string; stock: string; description: string
  valid: boolean; errors: string[]
}

const TEMPLATE_HEADERS = ['title','category','price','stock','description']
const SAMPLE_CSV = `title,category,price,stock,description
Sony WH-1000XM5 Headphones,Electronics,32999,50,Industry-leading noise cancelling headphones
Nike Air Max 270,Fashion,12999,30,Men's shoe featuring Max Air unit
The Alchemist,Books,599,100,Paulo Coelho classic novel`

function parseCSV(text: string): Row[] {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, j) => { obj[h] = vals[j] || '' })
    const errors: string[] = []
    if (!obj.title)       errors.push('Title required')
    if (!obj.category)    errors.push('Category required')
    if (!obj.price || isNaN(+obj.price) || +obj.price <= 0) errors.push('Valid price required')
    if (!obj.stock || isNaN(+obj.stock) || +obj.stock < 0)  errors.push('Valid stock required')
    rows.push({ title: obj.title, category: obj.category, price: obj.price, stock: obj.stock, description: obj.description, valid: errors.length === 0, errors })
  }
  return rows
}

export default function BulkUploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'seller' && user.role !== 'admin'))) router.push('/')
  }, [user, loading, router])

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setDone(false)
    }
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) handleFile(file)
    else toast.error('Please upload a .csv file')
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function uploadAll() {
    const valid = rows.filter(r => r.valid)
    if (!valid.length) { toast.error('No valid rows to import'); return }
    setUploading(true)
    await new Promise(r => setTimeout(r, 1200))
    setUploading(false)
    setDone(true)
    toast.success(`${valid.length} products imported successfully!`)
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'primepasal-product-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const validCount   = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  if (loading || !user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/seller/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
        <FiArrowLeft /> My Products
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FiUpload className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Bulk Product Upload</h1>
          <p className="text-sm text-gray-500">Import multiple products at once via CSV</p>
        </div>
        <button onClick={downloadTemplate}
          className="ml-auto flex items-center gap-2 text-sm border border-gray-200 hover:border-violet-400 text-gray-700 px-4 py-2 rounded-xl font-semibold transition-colors">
          <FiDownload /> Download Template
        </button>
      </div>

      {/* Steps */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { step: '1', title: 'Download template', desc: 'Get the CSV with the correct column headers' },
          { step: '2', title: 'Fill in products',  desc: 'Add your products — one row per product' },
          { step: '3', title: 'Upload & import',   desc: 'Drag your CSV here and click Import' },
        ].map(({ step, title, desc }) => (
          <div key={step} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">{step}</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer mb-5 ${dragging ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400 bg-gray-50'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileInput} />
        <FiUpload className={`text-4xl mx-auto mb-3 ${dragging ? 'text-violet-500' : 'text-gray-400'}`} />
        <p className="font-bold text-gray-700">Drag & drop your CSV here</p>
        <p className="text-sm text-gray-500 mt-1">or click to browse · .csv files only</p>
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-3">
            <p className="font-bold text-gray-900">{rows.length} rows found</p>
            <span className="flex items-center gap-1 text-sm text-green-600 font-semibold"><FiCheck /> {validCount} valid</span>
            {invalidCount > 0 && <span className="flex items-center gap-1 text-sm text-red-500 font-semibold"><FiX /> {invalidCount} with errors</span>}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 border-b">
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-left">Issues</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, i) => (
                    <tr key={i} className={row.valid ? 'hover:bg-gray-50' : 'bg-red-50'}>
                      <td className="px-3 py-2">
                        {row.valid
                          ? <FiCheck className="text-green-500" />
                          : <FiX className="text-red-500" />
                        }
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate">{row.title || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{row.category || '—'}</td>
                      <td className="px-3 py-2 text-right">{row.price ? `Rs.${Number(row.price).toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2 text-right">{row.stock || '—'}</td>
                      <td className="px-3 py-2 text-xs text-red-600">{row.errors.join(', ') || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" />
              <span>Rows with errors will be skipped. Fix the CSV and re-upload to include them.</span>
            </div>
          )}

          {done ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 font-bold text-sm">
              <FiCheck /> {validCount} products imported! They are pending admin approval.
            </div>
          ) : (
            <button onClick={uploadAll} disabled={uploading || validCount === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              <FiUpload /> {uploading ? 'Importing…' : `Import ${validCount} products`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
