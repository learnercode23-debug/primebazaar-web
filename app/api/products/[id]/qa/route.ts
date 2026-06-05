export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import ProductQA from '@/models/ProductQA'
import Product from '@/models/Product'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const qas = await ProductQA.find({ product: params.id, isApproved: true })
      .populate('user', 'name avatar')
      .populate('answers.user', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({ success: true, data: qas })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { question, answer, qaId } = await req.json()

    if (qaId && answer) {
      // Adding an answer to existing question
      const qa = await ProductQA.findById(qaId)
      if (!qa) return NextResponse.json({ success: false, error: 'Q&A not found' }, { status: 404 })

      // Check if seller or admin
      const product = await Product.findById(params.id)
      const isSeller = product?.seller.toString() === user._id.toString()

      qa.answers.push({
        user: user._id,
        text: answer,
        helpful: 0,
        isSeller,
        isAdmin: user.role === 'admin',
        createdAt: new Date(),
      })
      qa.isAnswered = true
      await qa.save()
      await qa.populate('user', 'name avatar')
      await qa.populate('answers.user', 'name avatar role')
      return NextResponse.json({ success: true, data: qa })
    }

    // New question
    const qa = await ProductQA.create({
      product: params.id,
      user: user._id,
      question,
    })

    // Increment qaCount
    await Product.findByIdAndUpdate(params.id, { $inc: { qaCount: 1 } })
    await qa.populate('user', 'name avatar')
    return NextResponse.json({ success: true, data: qa }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
