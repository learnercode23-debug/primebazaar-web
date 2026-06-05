export const dynamic = 'force-dynamic'
/**
 * GET  /api/support/articles?q=keyword&category=orders
 * POST /api/support/articles — admin: create article
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import HelpArticle from '@/models/HelpArticle'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const q        = searchParams.get('q')?.trim()
    const category = searchParams.get('category')
    const limit    = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    const filter: Record<string, unknown> = { isPublished: true }
    if (category) filter.category = category
    if (q) {
      // Try text search first; fall back to regex if no text index
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { tags:  { $regex: q, $options: 'i' } },
      ]
    }

    const articles = await HelpArticle.find(filter)
      .select('title slug category tags views createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, data: articles })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }
    await connectDB()

    const { title, body, category, tags, isPublished } = await req.json()
    if (!title || !body || !category) {
      return NextResponse.json({ success: false, error: 'title, body, category required' }, { status: 400 })
    }

    const article = await HelpArticle.create({
      title, body, category,
      tags:        tags || [],
      isPublished: isPublished ?? true,
      createdBy:   user._id,
    })
    return NextResponse.json({ success: true, data: article }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
