import mongoose, { Schema, Document } from 'mongoose'

export interface IProductVariant {
  _id?: mongoose.Types.ObjectId
  sku?: string
  attributes: Record<string, string> // { color: 'Red', size: 'XL' }
  price: number
  discountPrice?: number
  stock: number
  images: string[]
}

export interface IProduct extends Document {
  title: string
  slug: string
  description: string
  featureBullets: string[]
  price: number
  discountPrice?: number
  discountPercent?: number
  category: mongoose.Types.ObjectId
  subcategoryPath: string[] // breadcrumb slugs
  brand: string
  images: string[]
  videoUrl?: string
  variants: IProductVariant[]
  hasVariants: boolean
  stock: number
  seller: mongoose.Types.ObjectId
  rating: number
  reviewCount: number
  qaCount: number
  salesCount: number
  viewCount: number
  isApproved: boolean
  isFeatured: boolean
  isDealOfDay: boolean
  isLightningDeal: boolean
  dealEndTime?: Date
  lightningDealStartTime?: Date
  lightningDealEndTime?: Date
  lightningDealQuantity?: number
  lightningDealSold?: number
  tags: string[]
  specifications?: Map<string, string>
  freeShipping: boolean
  shippingCost: number
  estimatedDeliveryDays: number
  weight?: number
  dimensions?: { length: number; width: number; height: number }
  metaTitle?: string
  metaDescription?: string
  createdAt: Date
  updatedAt: Date
}

const VariantSchema = new Schema<IProductVariant>({
  sku: { type: String },
  attributes: { type: Map, of: String, default: {} },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: [{ type: String }],
})

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true },
    description: { type: String, required: true },
    featureBullets: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategoryPath: [{ type: String }],
    brand: { type: String, required: true },
    images: [{ type: String }],
    videoUrl: { type: String },
    variants: [VariantSchema],
    hasVariants: { type: Boolean, default: false },
    stock: { type: Number, required: true, min: 0, default: 0 },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    qaCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isDealOfDay: { type: Boolean, default: false },
    isLightningDeal: { type: Boolean, default: false },
    dealEndTime: { type: Date },
    lightningDealStartTime: { type: Date },
    lightningDealEndTime: { type: Date },
    lightningDealQuantity: { type: Number },
    lightningDealSold: { type: Number, default: 0 },
    tags: [{ type: String }],
    specifications: { type: Map, of: String },
    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, default: 5.99 },
    estimatedDeliveryDays: { type: Number, default: 5 },
    weight: { type: Number },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    metaTitle: { type: String },
    metaDescription: { type: String },
  },
  { timestamps: true }
)

ProductSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' })
ProductSchema.index({ category: 1, isApproved: 1 })
ProductSchema.index({ seller: 1, isApproved: 1 })
ProductSchema.index({ salesCount: -1 })
ProductSchema.index({ createdAt: -1 })
ProductSchema.index({ rating: -1 })
// Note: slug index is created automatically via unique:true in the schema field definition

ProductSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
  }
  next()
})

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
