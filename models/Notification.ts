import mongoose, { Schema, Document } from 'mongoose'

export type NotificationType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'return_approved'
  | 'return_rejected'
  | 'review_posted'
  | 'price_drop'
  | 'back_in_stock'
  | 'promotion'
  | 'seller_new_order'
  | 'seller_return_request'
  | 'admin_alert'
  | 'order_accepted'    // seller accepted
  | 'order_packed'      // seller packed

export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  metadata?: Record<string, string>
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
)

NotificationSchema.index({ user: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
