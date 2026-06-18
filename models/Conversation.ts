import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  customer:          mongoose.Types.ObjectId
  seller:            mongoose.Types.ObjectId
  product?:          mongoose.Types.ObjectId
  order?:            mongoose.Types.ObjectId
  lastMessage:       string
  lastMessageAt:     Date
  lastSenderRole:    'customer' | 'seller'
  unreadByCustomer:  number
  unreadBySeller:    number
  status:            'active' | 'archived'
  createdAt:         Date
  updatedAt:         Date
}

const ConversationSchema = new Schema<IConversation>({
  customer:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seller:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product:          { type: Schema.Types.ObjectId, ref: 'Product' },
  order:            { type: Schema.Types.ObjectId, ref: 'Order' },
  lastMessage:      { type: String, default: '' },
  lastMessageAt:    { type: Date, default: Date.now },
  lastSenderRole:   { type: String, enum: ['customer', 'seller'], default: 'customer' },
  unreadByCustomer: { type: Number, default: 0 },
  unreadBySeller:   { type: Number, default: 0 },
  status:           { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true })

ConversationSchema.index({ customer: 1, updatedAt: -1 })
ConversationSchema.index({ seller:   1, updatedAt: -1 })
ConversationSchema.index({ customer: 1, seller: 1, product: 1 }, { unique: true, sparse: true })
ConversationSchema.index({ customer: 1, seller: 1, order: 1 }, { unique: true, sparse: true })

export default mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema)
