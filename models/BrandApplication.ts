import mongoose, { Schema, Document } from 'mongoose'

export interface IBrandApplication extends Document {
  seller: mongoose.Types.ObjectId
  brandName: string
  website?: string
  category: string
  tradeMark: boolean
  trademarkNumber?: string
  status: 'pending' | 'approved' | 'rejected'
  note?: string
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const BrandApplicationSchema = new Schema<IBrandApplication>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brandName: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    category: { type: String, required: true },
    tradeMark: { type: Boolean, default: false },
    trademarkNumber: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    note: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.BrandApplication ||
  mongoose.model<IBrandApplication>('BrandApplication', BrandApplicationSchema)
