'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { FiThumbsUp, FiMessageSquare, FiChevronDown } from 'react-icons/fi'

interface Answer {
  _id: string
  user: { name: string; avatar?: string }
  text: string
  helpful: number
  isSeller: boolean
  isAdmin: boolean
  createdAt: string
}

interface QA {
  _id: string
  user: { name: string }
  question: string
  answers: Answer[]
  isAnswered: boolean
  createdAt: string
}

export default function ProductQASection({ productId }: { productId: string }) {
  const { user } = useAuth()
  const [qas, setQas] = useState<QA[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [answerForms, setAnswerForms] = useState<Record<string, string>>({})
  const [showAskForm, setShowAskForm] = useState(false)

  useEffect(() => {
    axios.get(`/api/products/${productId}/qa`)
      .then((r) => setQas(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { toast.error('Please login to ask a question'); return }
    setSubmitting(true)
    try {
      const res = await axios.post(`/api/products/${productId}/qa`, { question })
      setQas((p) => [res.data.data, ...p])
      setQuestion('')
      setShowAskForm(false)
      toast.success('Question submitted!')
    } catch {
      toast.error('Failed to submit question')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAnswer(qaId: string) {
    if (!user) { toast.error('Please login to answer'); return }
    const answer = answerForms[qaId]?.trim()
    if (!answer) return
    try {
      const res = await axios.post(`/api/products/${productId}/qa`, { qaId, answer })
      setQas((p) => p.map((q) => q._id === qaId ? res.data.data : q))
      setAnswerForms((p) => { const n = { ...p }; delete n[qaId]; return n })
      toast.success('Answer submitted!')
    } catch {
      toast.error('Failed to submit answer')
    }
  }

  const visible = showAll ? qas : qas.slice(0, 5)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <FiMessageSquare className="text-amazon-orange" />
          Customer Questions & Answers ({qas.length})
        </h2>
        <button
          onClick={() => setShowAskForm(!showAskForm)}
          className="text-sm bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full transition-colors"
        >
          Ask a Question
        </button>
      </div>

      {showAskForm && (
        <form onSubmit={submitQuestion} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="What would you like to know about this product?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none"
            required
          />
          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={submitting} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-4 py-2 rounded-full text-sm">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowAskForm(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : qas.length === 0 ? (
        <p className="text-gray-500 text-sm">No questions yet. Be the first to ask!</p>
      ) : (
        <div className="space-y-5">
          {visible.map((qa) => (
            <div key={qa._id} className="border-b border-gray-100 pb-5 last:border-0">
              <div className="flex items-start gap-2 mb-3">
                <span className="bg-amazon-orange text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">Q</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{qa.question}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Asked by {qa.user?.name} · {formatDate(qa.createdAt)}</p>
                </div>
              </div>

              {qa.answers.length > 0 && (
                <div className="ml-8 space-y-2">
                  {qa.answers.map((ans) => (
                    <div key={ans._id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="bg-amazon-blue text-white text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">A</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{ans.text}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {ans.isSeller && <span className="text-amazon-orange font-medium">Seller</span>}
                              {ans.isAdmin && <span className="text-amazon-red font-medium">Admin</span>}
                              {!ans.isSeller && !ans.isAdmin && ans.user?.name}
                              {' '} · {formatDate(ans.createdAt)}
                            </span>
                            <button className="text-xs text-gray-400 flex items-center gap-0.5 hover:text-gray-700">
                              <FiThumbsUp className="text-xs" /> Helpful ({ans.helpful})
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer form */}
              {user && (
                <div className="ml-8 mt-2">
                  {answerForms[qa._id] !== undefined ? (
                    <div className="flex gap-2">
                      <textarea
                        value={answerForms[qa._id]}
                        onChange={(e) => setAnswerForms((p) => ({ ...p, [qa._id]: e.target.value }))}
                        rows={2}
                        placeholder="Write an answer..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amazon-orange resize-none"
                      />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => submitAnswer(qa._id)} className="bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-medium px-3 py-1.5 rounded-lg text-xs">
                          Post
                        </button>
                        <button onClick={() => setAnswerForms((p) => { const n = { ...p }; delete n[qa._id]; return n })} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAnswerForms((p) => ({ ...p, [qa._id]: '' }))}
                      className="text-xs text-amazon-teal hover:underline"
                    >
                      Answer this question
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {qas.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-amazon-teal hover:underline flex items-center gap-1"
            >
              <FiChevronDown className={showAll ? 'rotate-180' : ''} />
              {showAll ? 'Show fewer questions' : `See all ${qas.length} questions`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
