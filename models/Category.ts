import mongoose, { Schema, Document } from 'mongoose'

export interface ICategory extends Document {
  name: string
  slug: string
  description?: string
  icon?: string
  image?: string
  parent?: mongoose.Types.ObjectId | null
  level: number
  order: number
  isActive: boolean
  metaTitle?: string
  metaDescription?: string
  commission: number
  createdAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    icon: { type: String },
    image: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    level: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    commission: { type: Number, default: 10 }, // platform fee %
  },
  { timestamps: true }
)

CategorySchema.index({ parent: 1, order: 1 })

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema)
