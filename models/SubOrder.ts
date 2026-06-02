/**
 * SubOrder — one per seller per parent order.
 *
 * Relationship:
 *   Order (parent) 1 ──── N SubOrder (one per seller)
 *   SubOrder       1 ──── N items (that seller's items only)
 *
 * The seller hub shows SubOrders, not the parent Order.
 * The customer sees the parent Order with its SubOrders as "shipments".
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface ISubOrderItem {
  product: mongoose.Types.ObjectId
  title: string
  image: string
  price: number
  originalPrice: number
  quantity: number
  sku?: string
  variantLabel?: string
}

export interface ISubOrder extends Document {
  parentOrder: mongoose.Types.ObjectId   // Link to main Order
  subOrderNumber: string                 // e.g. AMZ-123-S1
  seller: mongoose.Types.ObjectId
  items: ISubOrderItem[]
  subtotal: number
  shippingCost: number
  totalAmount: number

  // Independent status per seller
  status:
    | 'confirmed'      // waiting for seller to accept
    | 'processing'     // seller accepted
    | 'packed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'

  // Timestamps
  acceptedAt?: Date
  packedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  rejectedAt?: Date

  // Seller rejection
  rejectionReason?: string
  rejectionCategory?: string

  // Tracking
  trackingNumber?: string
  trackingCarrier?: string

  // Status history for audit trail
  statusHistory: Array<{ status: string; timestamp: Date; note?: string }>

  createdAt: Date
  updatedAt: Date
}

const SubOrderItemSchema = new Schema<ISubOrderItem>({
  product:       { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title:         { type: String, required: true },
  image:         { type: String, default: '' },
  price:         { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  quantity:      { type: Number, required: true, min: 1 },
  sku:           { type: String },
  variantLabel:  { type: String },
})

const SubOrderSchema = new Schema<ISubOrder>({
  parentOrder:       { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  subOrderNumber:    { type: String, unique: true },
  seller:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items:             [SubOrderItemSchema],
  subtotal:          { type: Number, required: true },
  shippingCost:      { type: Number, default: 0 },
  totalAmount:       { type: Number, required: true },
  status: {
    type: String,
    enum: ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'confirmed',
  },
  acceptedAt:        { type: Date },
  packedAt:          { type: Date },
  shippedAt:         { type: Date },
  deliveredAt:       { type: Date },
  rejectedAt:        { type: Date },
  rejectionReason:   { type: String },
  rejectionCategory: { type: String },
  trackingNumber:    { type: String },
  trackingCarrier:   { type: String },
  statusHistory:     [{ status: String, timestamp: { type: Date, default: Date.now }, note: String }],
}, { timestamps: true })

SubOrderSchema.pre('save', function (next) {
  if (!this.subOrderNumber) {
    this.subOrderNumber = 'SUB-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
  }
  next()
})

SubOrderSchema.index({ seller: 1, status: 1, createdAt: -1 })
SubOrderSchema.index({ parentOrder: 1 })

export default mongoose.models.SubOrder ||
  mongoose.model<ISubOrder>('SubOrder', SubOrderSchema)
