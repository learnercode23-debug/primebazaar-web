import mongoose, { Schema, Document } from 'mongoose'

export interface ISellerWallet extends Document {
  seller: mongoose.Types.ObjectId
  totalEarned: number       // Lifetime total earned
  pendingBalance: number    // Earned but return window not passed (7 days)
  availableBalance: number  // Ready to be paid out
  paidOutBalance: number    // Already transferred to bank
  lastSettledAt?: Date
  updatedAt: Date
}

const SellerWalletSchema = new Schema<ISellerWallet>({
  seller:           { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalEarned:      { type: Number, default: 0 },
  pendingBalance:   { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  paidOutBalance:   { type: Number, default: 0 },
  lastSettledAt:    { type: Date },
}, { timestamps: true })

export default mongoose.models.SellerWallet ||
  mongoose.model<ISellerWallet>('SellerWallet', SellerWalletSchema)
