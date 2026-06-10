import mongoose, { Schema, Document } from 'mongoose'

export interface IGiftCard extends Document {
  code: string
  amount: number
  balance: number
  design: string
  recipientName: string
  recipientEmail: string
  senderName: string
  message?: string
  purchasedBy?: mongoose.Types.ObjectId
  redeemedBy?: mongoose.Types.ObjectId
  status: 'active' | 'redeemed' | 'expired'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const GiftCardSchema = new Schema<IGiftCard>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    balance: { type: Number, required: true, min: 0 },
    design: { type: String, default: 'celebration' },
    recipientName: { type: String, required: true },
    recipientEmail: { type: String, required: true, lowercase: true },
    senderName: { type: String, required: true },
    message: { type: String },
    purchasedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'redeemed', 'expired'], default: 'active', index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.GiftCard || mongoose.model<IGiftCard>('GiftCard', GiftCardSchema)
