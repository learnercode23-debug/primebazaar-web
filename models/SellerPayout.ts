import mongoose, { Schema, Document } from 'mongoose'

export interface ISellerPayout extends Document {
  seller: mongoose.Types.ObjectId
  amount: number
  // Bank details snapshot (never store full account number — last 4 only)
  bankName: string
  accountHolderName: string
  accountLast4: string
  // Payout status
  status: 'initiated' | 'processing' | 'success' | 'failed'
  referenceId?: string    // ID from payout provider (eSewa / Khalti / Stripe)
  failureReason?: string
  // Linked ledger entries included in this payout
  ledgerEntries: mongoose.Types.ObjectId[]
  initiatedAt: Date
  completedAt?: Date
  // Who triggered this payout
  initiatedBy: mongoose.Types.ObjectId  // Admin user _id
  notes?: string
}

const SellerPayoutSchema = new Schema<ISellerPayout>({
  seller:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:              { type: Number, required: true },
  bankName:            { type: String, required: true },
  accountHolderName:   { type: String, required: true },
  accountLast4:        { type: String, required: true },
  status:              { type: String, enum: ['initiated', 'processing', 'success', 'failed'], default: 'initiated' },
  referenceId:         { type: String },
  failureReason:       { type: String },
  ledgerEntries:       [{ type: Schema.Types.ObjectId, ref: 'SellerLedger' }],
  initiatedAt:         { type: Date, default: Date.now },
  completedAt:         { type: Date },
  initiatedBy:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes:               { type: String },
}, { timestamps: true })

SellerPayoutSchema.index({ seller: 1, createdAt: -1 })
SellerPayoutSchema.index({ status: 1 })

export default mongoose.models.SellerPayout ||
  mongoose.model<ISellerPayout>('SellerPayout', SellerPayoutSchema)
