import mongoose, { Schema, Document } from 'mongoose'

/**
 * One ledger entry = one order item delivered by this seller.
 * Tracks the full fee breakdown and earning status.
 */
export interface ISellerLedger extends Document {
  seller: mongoose.Types.ObjectId
  order: mongoose.Types.ObjectId
  orderNumber: string
  itemTitle: string
  // Money flow
  grossAmount: number       // item_price × quantity (what customer paid)
  commissionRate: number    // % charged by platform (from Category.commission)
  commissionFee: number     // grossAmount × commissionRate / 100
  collectionFee: number     // 2% payment gateway cost passed to seller
  netEarning: number        // grossAmount - commissionFee - collectionFee
  // Status
  status: 'pending' | 'available' | 'paid' | 'refunded'
  availableAt: Date         // deliveredAt + 7-day return window
  paidAt?: Date
  payout?: mongoose.Types.ObjectId
  createdAt: Date
}

const SellerLedgerSchema = new Schema<ISellerLedger>({
  seller:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  order:          { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber:    { type: String, required: true },
  itemTitle:      { type: String, required: true },
  grossAmount:    { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commissionFee:  { type: Number, required: true },
  collectionFee:  { type: Number, required: true },
  netEarning:     { type: Number, required: true },
  status:         { type: String, enum: ['pending', 'available', 'paid', 'refunded'], default: 'pending' },
  availableAt:    { type: Date, required: true },
  paidAt:         { type: Date },
  payout:         { type: Schema.Types.ObjectId, ref: 'SellerPayout' },
}, { timestamps: true })

SellerLedgerSchema.index({ seller: 1, status: 1 })
SellerLedgerSchema.index({ order: 1 })
SellerLedgerSchema.index({ availableAt: 1, status: 1 })

export default mongoose.models.SellerLedger ||
  mongoose.model<ISellerLedger>('SellerLedger', SellerLedgerSchema)
