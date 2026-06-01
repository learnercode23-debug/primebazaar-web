import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxDiscount?: number
  validFrom: Date
  validTo: Date
  usageLimit: number
  usedCount: number
  isActive: boolean
  createdBy: mongoose.Types.ObjectId
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

export default mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema)
