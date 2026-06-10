import mongoose, { Schema, Document } from 'mongoose'

export interface IAdCampaign extends Document {
  seller: mongoose.Types.ObjectId
  product: mongoose.Types.ObjectId
  productTitle: string
  productImage: string
  type: 'auto' | 'manual'
  status: 'active' | 'paused' | 'ended'
  budget: number
  bid: number
  keywords: string[]
  startDate?: Date
  endDate?: Date
  // Metrics — accumulate as the ad-serving layer records events (start at 0).
  impressions: number
  clicks: number
  orders: number
  revenue: number
  spend: number
  createdAt: Date
  updatedAt: Date
}

const AdCampaignSchema = new Schema<IAdCampaign>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productTitle: { type: String, required: true },
    productImage: { type: String, default: '' },
    type: { type: String, enum: ['auto', 'manual'], default: 'manual' },
    status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
    budget: { type: Number, required: true, min: 0 },
    bid: { type: Number, default: 5, min: 0 },
    keywords: [{ type: String }],
    startDate: { type: Date },
    endDate: { type: Date },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.models.AdCampaign ||
  mongoose.model<IAdCampaign>('AdCampaign', AdCampaignSchema)
