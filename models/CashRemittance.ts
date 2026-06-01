import mongoose, { Schema, Document } from 'mongoose'

/**
 * Records when a delivery agent hands collected COD cash to the company.
 * Used for cash reconciliation.
 */
export interface ICashRemittance extends Document {
  agent: mongoose.Types.ObjectId
  orders: mongoose.Types.ObjectId[]   // Orders included in this remittance
  totalAmount: number
  handedAt: Date
  receivedBy: mongoose.Types.ObjectId // Admin who confirmed receipt
  notes?: string
  status: 'pending' | 'confirmed'
}

const CashRemittanceSchema = new Schema<ICashRemittance>({
  agent:       { type: Schema.Types.ObjectId, ref: 'DeliveryAgent', required: true },
  orders:      [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  totalAmount: { type: Number, required: true },
  handedAt:    { type: Date, default: Date.now },
  receivedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  notes:       { type: String },
  status:      { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
}, { timestamps: true })

export default mongoose.models.CashRemittance ||
  mongoose.model<ICashRemittance>('CashRemittance', CashRemittanceSchema)
