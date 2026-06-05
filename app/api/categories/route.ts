export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Category from '@/models/Category'
import { cacheGet, cacheSet } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tree = searchParams.get('tree') === 'true'
    const parentId = searchParams.get('parent')

    const cacheKey = `categories:${tree}:${parentId || 'all'}`
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))

    await connectDB()

    const query: Record<string, unknown> = { isActive: true }
    if (parentId === 'root') query.parent = null
    else if (parentId) query.parent = parentId

    const categories = await Category.find(query).sort({ order: 1, name: 1 }).lean()

    if (tree) {
      type CatRecord = typeof categories[number] & { _id: { toString: () => string } }
      const buildTree = (parentId: string | null): unknown[] =>
        (categories as CatRecord[])
          .filter((c) => (parentId ? c.parent?.toString() === parentId : !c.parent))
          .map((c) => ({ ...c, children: buildTree(c._id.toString()) }))
      const result = { success: true, data: buildTree(null) }
      await cacheSet(cacheKey, JSON.stringify(result), 300)
      return NextResponse.json(result)
    }

    const result = { success: true, data: categories }
    await cacheSet(cacheKey, JSON.stringify(result), 300)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const body = await req.json()

    // Determine level from parent
    let level = 0
    if (body.parent) {
      const parent = await Category.findById(body.parent)
      if (parent) level = parent.level + 1
    }

    const category = await Category.create({ ...body, level })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
