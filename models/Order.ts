import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  product: mongoose.Types.ObjectId
  title: string
  image: string
  price: number
  originalPrice: number
  quantity: number
  seller: mongoose.Types.ObjectId
  variantId?: string
  variantLabel?: string
  sku?: string
}

export interface IOrder extends Document {
  orderNumber: string
  user: mongoose.Types.ObjectId
  items: IOrderItem[]
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    phone: string
  }
  deliveryOption: 'standard' | 'express' | 'scheduled'
  scheduledDelivery?: Date
  estimatedDelivery?: Date
  actualDelivery?: Date
  paymentMethod: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'

  // ── Seller Hub status flow ────────────────────────────────────────────────
  // confirmed → (seller accepts) → processing → packed → shipped → delivered
  // confirmed → (seller rejects) → cancelled
  status:
    | 'pending'
    | 'confirmed'      // payment done, waiting for seller
    | 'processing'     // seller accepted
    | 'packed'         // seller packed it
    | 'shipped'        // dispatched with tracking
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned'

  // Seller action timestamps
  acceptedAt?: Date
  packedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  rejectionCategory?: 'out_of_stock' | 'damaged' | 'pricing_error' | 'other'

  subtotal: number
  shippingCost: number
  tax: number
  discount: number
  storeCreditUsed: number
  totalAmount: number
  couponCode?: string
  trackingNumber?: string
  trackingCarrier?: string
  stripePaymentIntentId?: string
  invoiceNumber?: string
  giftOptions: {
    isGift: boolean
    giftMessage?: string
    giftWrap: boolean
  }
  returnRequested: boolean
  notes?: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  variantId: { type: String },
  variantLabel: { type: String },
  sku: { type: String },
})

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    shippingAddress: {
      name: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'US' },
      phone: { type: String, required: true },
    },
    deliveryOption: { type: String, enum: ['standard', 'express', 'scheduled'], default: 'standard' },
    scheduledDelivery: { type: Date },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    paymentMethod: { type: String, required: true, default: 'card' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },
    // Seller action timestamps
    acceptedAt: { type: Date },
    packedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    rejectionCategory: {
      type: String,
      enum: ['out_of_stock', 'damaged', 'pricing_error', 'other'],
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    storeCreditUsed: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    couponCode: { type: String },
    trackingNumber: { type: String },
    trackingCarrier: { type: String },
    stripePaymentIntentId: { type: String },
    invoiceNumber: { type: String, unique: true, sparse: true },
    giftOptions: {
      isGift: { type: Boolean, default: false },
      giftMessage: { type: String },
      giftWrap: { type: Boolean, default: false },
    },
    returnRequested: { type: Boolean, default: false },
    notes: { type: String },
    adminNotes: { type: String },
  },
  { timestamps: true }
)

OrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = 'AMZ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
  }
  if (!this.invoiceNumber && this.paymentStatus === 'paid') {
    this.invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase()
  }
  next()
})

// Index for seller hub queries
OrderSchema.index({ 'items.seller': 1, status: 1, createdAt: -1 })
OrderSchema.index({ user: 1, createdAt: -1 })

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)
