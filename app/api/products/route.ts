import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const brand = searchParams.get('brand')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const featured = searchParams.get('featured')
    const dealOfDay = searchParams.get('dealOfDay')

    const query: Record<string, unknown> = { isApproved: true }

    if (category) query.category = category
    if (subcategory) query.subcategory = subcategory
    if (brand) query.brand = { $regex: brand, $options: 'i' }
    if (featured === 'true') query.isFeatured = true
    if (dealOfDay === 'true') query.isDealOfDay = true

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) (query.price as Record<string, number>).$gte = parseFloat(minPrice)
      if (maxPrice) (query.price as Record<string, number>).$lte = parseFloat(maxPrice)
    }

    if (minRating) query.rating = { $gte: parseFloat(minRating) }

    if (search) {
      query.$text = { $search: search }
    }

    const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 }

    const skip = (page - 1) * limit
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('seller', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const body = await req.json()

    // Resolve category: accept ObjectId, slug, or name string
    let categoryId = body.category
    if (categoryId && typeof categoryId === 'string' && categoryId.length < 24) {
      const cat = await Category.findOne({
        $or: [{ slug: categoryId.toLowerCase() }, { name: { $regex: new RegExp(`^${categoryId}$`, 'i') } }]
      }).select('_id')
      if (cat) categoryId = cat._id
    }

    const product = await Product.create({
      ...body,
      category: categoryId,
      seller: user._id,
      isApproved: user.role === 'admin',
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
