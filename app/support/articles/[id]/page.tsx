'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { FiArrowLeft, FiEye, FiTag, FiMessageSquare } from 'react-icons/fi'

interface Article {
  _id: string
  title: string
  body: string
  category: string
  tags: string[]
  views: number
  createdAt: string
}

export default function ArticlePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    axios.get(`/api/support/articles/${id}`)
      .then(r => setArticle(r.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (notFound || !article) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-gray-500 mb-4">Article not found.</p>
      <Link href="/support" className="text-indigo-600 underline text-sm">Back to Help Center</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      <Link href="/support" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft/> Back to Help Center
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="mb-3">
          <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full capitalize font-medium">
            {article.category}
          </span>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">{article.title}</h1>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-6 pb-4 border-b border-gray-100">
          <span className="flex items-center gap-1"><FiEye/> {article.views} views</span>
          <span>{new Date(article.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {article.body}
        </div>

        {article.tags?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <FiTag className="text-gray-400 text-sm"/>
            {article.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
        <p className="font-bold text-gray-900 mb-1">Still need help?</p>
        <p className="text-sm text-gray-500 mb-4">Our support team is available 24/7</p>
        <Link href="/support"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
          <FiMessageSquare/> Contact Support
        </Link>
      </div>
    </div>
  )
}
