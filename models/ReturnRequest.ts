import mongoose, { Schema, Document } from 'mongoose'

export type ReturnReason =
  | 'defective'
  | 'not_as_described'
  | 'wrong_item'
  | 'not_needed'
  | 'damaged_in_shipping'
  | 'quality_issues'
  | 'other'

export interface IReturnItem {
  product: mongoose.Types.ObjectId
  title: string
  quantity: number
  price: number
  reason: ReturnReason
}

export interface IReturnRequest extends Document {
  returnNumber: string
  order: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  items: IReturnItem[]
  reason: ReturnReason
  reasonDetail?: string
  photos: string[]
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'received' | 'completed'
  refundMethod: 'original_payment' | 'store_credit'
  refundAmount: number
  adminNotes?: string
  sellerNotes?: string
  returnLabel?: string
  resolvedAt?: Date
  createdAt: Date
}

const ReturnItemSchema = new Schema<IReturnItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  reason: { type: String, required: true },
})

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    returnNumber: { type: String, unique: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [ReturnItemSchema],
    reason: { type: String, required: true },
    reasonDetail: { type: String },
    photos: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_transit', 'received', 'completed'],
      default: 'pending',
    },
    refundMethod: { type: String, enum: ['original_payment', 'store_credit'], default: 'original_payment' },
    refundAmount: { type: Number, default: 0 },
    adminNotes: { type: String },
    sellerNotes: { type: String },
    returnLabel: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
)

ReturnRequestSchema.pre('save', function (next) {
  if (!this.returnNumber) {
    this.returnNumber = 'RET-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase()
  }
  next()
})

export default mongoose.models.ReturnRequest || mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema)
