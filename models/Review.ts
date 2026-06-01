import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  user: mongoose.Types.ObjectId
  product: mongoose.Types.ObjectId
  order?: mongoose.Types.ObjectId
  rating: number
  title: string
  comment: string
  photos: string[]
  verified: boolean
  helpfulVotes: mongoose.Types.ObjectId[]
  unhelpfulVotes: mongoose.Types.ObjectId[]
  helpfulCount: number
  sellerResponse?: {
    text: string
    respondedAt: Date
  }
  isApproved: boolean
  isFlagged: boolean
  flagReason?: string
  createdAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    photos: [{ type: String }],
    verified: { type: Boolean, default: false },
    helpfulVotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    unhelpfulVotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    helpfulCount: { type: Number, default: 0 },
    sellerResponse: {
      text: String,
      respondedAt: Date,
    },
    isApproved: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String },
  },
  { timestamps: true }
)

ReviewSchema.index({ user: 1, product: 1 }, { unique: true })
ReviewSchema.index({ product: 1, createdAt: -1 })
ReviewSchema.index({ helpfulCount: -1 })

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)
