export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'
import { escapeRegex } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const page       = parseInt(searchParams.get('page') || '1')
    const limit      = parseInt(searchParams.get('limit') || '20')
    const category   = searchParams.get('category')
    const subcategory= searchParams.get('subcategory')
    const brand      = searchParams.get('brand')
    const minPrice   = searchParams.get('minPrice')
    const maxPrice   = searchParams.get('maxPrice')
    const minRating  = searchParams.get('minRating')
    const search     = searchParams.get('search')
    const sort       = searchParams.get('sort') || 'createdAt'
    const order      = searchParams.get('order') || 'desc'
    const featured   = searchParams.get('featured')
    const dealOfDay  = searchParams.get('dealOfDay')
    const lightning  = searchParams.get('lightning')
    const hasDiscount= searchParams.get('hasDiscount')
    const inStock    = searchParams.get('inStock')
    const newArrivals= searchParams.get('newArrivals')
    const discountPct= searchParams.get('discountPct')  // minimum discount %

    const query: Record<string, unknown> = { isApproved: true }

    if (category) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat: any = await Category.findOne({ name: { $regex: `^${category}$`, $options: 'i' } }).lean()
      query.category = cat?._id ?? null
    }
    if (subcategory) query.subcategory = subcategory
    if (brand) query.brand = { $regex: escapeRegex(brand), $options: 'i' }
    if (featured === 'true') query.isFeatured = true
    if (dealOfDay === 'true') query.isDealOfDay = true
    if (lightning === 'true') query.isLightningDeal = true
    if (hasDiscount === 'true') query.discountPrice = { $exists: true, $gt: 0 }
    if (inStock === 'true') query.stock = { $gt: 0 }
    if (newArrivals === 'true') query.createdAt = { $gte: new Date(Date.now() - 30 * 86_400_000) }

    if (discountPct) {
      // products where (1 - discountPrice/price) * 100 >= discountPct — filter post-aggregation
      // approximate with a raw filter: discountPrice is set
      query.discountPrice = { $exists: true, $gt: 0 }
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) (query.price as Record<string, number>).$gte = parseFloat(minPrice)
      if (maxPrice) (query.price as Record<string, number>).$lte = parseFloat(maxPrice)
    }

    if (minRating) query.rating = { $gte: parseFloat(minRating) }

    const skip = (page - 1) * limit

    // ── ML-ranked search: use aggregation when a search query is present ──────
    if (search) {
      query.$text = { $search: search }

      const pipeline = [
        { $match: query },
        {
          $addFields: {
            _textScore: { $meta: 'textScore' },
            _salesNorm: { $min: [{ $divide: [{ $ifNull: ['$salesCount', 0] }, 500] }, 1] },
            _ratingNorm: { $divide: [{ $ifNull: ['$rating', 0] }, 5] },
          },
        },
        {
          $addFields: {
            mlRelevance: {
              $add: [
                { $multiply: ['$_textScore', 0.40] },
                { $multiply: ['$_salesNorm',  0.35] },
                { $multiply: ['$_ratingNorm', 0.25] },
              ],
            },
          },
        },
        { $sort: { mlRelevance: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'seller', foreignField: '_id', as: '_seller' } },
        { $addFields: { seller: { $arrayElemAt: ['$_seller', 0] } } },
        { $project: { _seller: 0, _textScore: 0, _salesNorm: 0, _ratingNorm: 0 } },
      ]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [products, totalArr] = await Promise.all([
        Product.aggregate(pipeline as Parameters<typeof Product.aggregate>[0]),
        Product.countDocuments(query),
      ])

      return NextResponse.json({
        success: true,
        data: products,
        total: totalArr,
        page,
        totalPages: Math.ceil(totalArr / limit),
        mlRanked: true,
      })
    }

    // ── Standard sort (no search query) ──────────────────────────────────────
    const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 }

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
        $or: [{ slug: categoryId.toLowerCase() }, { name: { $regex: new RegExp(`^${categoryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }]
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
