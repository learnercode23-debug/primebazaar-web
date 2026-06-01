import mongoose, { Schema, Document } from 'mongoose'

export interface IBanner extends Document {
  title: string
  subtitle?: string
  image: string
  mobileImage?: string
  link?: string
  buttonText?: string
  position: 'hero' | 'promo_strip' | 'category_top' | 'sidebar'
  order: number
  isActive: boolean
  startDate?: Date
  endDate?: Date
  backgroundColor?: string
  textColor?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    image: { type: String, required: true },
    mobileImage: { type: String },
    link: { type: String },
    buttonText: { type: String, default: 'Shop Now' },
    position: {
      type: String,
      enum: ['hero', 'promo_strip', 'category_top', 'sidebar'],
      default: 'hero',
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    backgroundColor: { type: String, default: '#131921' },
    textColor: { type: String, default: '#ffffff' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

BannerSchema.index({ position: 1, order: 1, isActive: 1 })

export default mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema)
