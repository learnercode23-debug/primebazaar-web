import mongoose, { Schema, Document } from 'mongoose'

export interface IFraudReview extends Document {
  order: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'blocked'
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
}

const FraudReviewSchema = new Schema<IFraudReview>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.FraudReview ||
  mongoose.model<IFraudReview>('FraudReview', FraudReviewSchema)
