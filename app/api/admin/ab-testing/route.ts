export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ABTest from '@/models/ABTest'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const tests = await ABTest.find().sort({ createdAt: -1 }).limit(100).lean()
    return NextResponse.json({ data: tests })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { name, metric, variantA, variantB } = await req.json()
    if (!name?.trim() || !metric?.trim() || !variantA?.trim() || !variantB?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    const test = await ABTest.create({
      name: name.trim(),
      metric: metric.trim(),
      status: 'running',
      variantA: { name: variantA.trim(), visitors: 0, conversions: 0 },
      variantB: { name: variantB.trim(), visitors: 0, conversions: 0 },
      createdBy: user._id,
    })
    return NextResponse.json({ data: test }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { id, status, winner, record } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const update: Record<string, unknown> = {}
    if (winner === 'A' || winner === 'B') { update.winner = winner; update.status = 'completed' }
    if (status && ['running', 'paused', 'completed'].includes(status)) update.status = status
    // Record observed numbers for a variant (e.g. from analytics): adds to the running totals
    if (record && (record.variant === 'A' || record.variant === 'B')) {
      const key = record.variant === 'A' ? 'variantA' : 'variantB'
      const inc: Record<string, number> = {}
      if (Number(record.visitors) > 0) inc[`${key}.visitors`] = Math.floor(Number(record.visitors))
      if (Number(record.conversions) > 0) inc[`${key}.conversions`] = Math.floor(Number(record.conversions))
      if (Object.keys(inc).length > 0) {
        const test = await ABTest.findByIdAndUpdate(id, { $inc: inc, ...update }, { new: true })
        if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })
        return NextResponse.json({ data: test })
      }
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    const test = await ABTest.findByIdAndUpdate(id, update, { new: true })
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    return NextResponse.json({ data: test })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await connectDB()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await ABTest.findByIdAndDelete(id)
    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
