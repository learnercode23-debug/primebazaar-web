import mongoose, { Schema, Document } from 'mongoose'

export interface IDirectMessage extends Document {
  conversation: mongoose.Types.ObjectId
  sender:       mongoose.Types.ObjectId
  senderRole:   'customer' | 'seller' | 'bot'
  body:         string
  read:         boolean
  createdAt:    Date
}

const DirectMessageSchema = new Schema<IDirectMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: Schema.Types.ObjectId, ref: 'User' },
  senderRole:   { type: String, enum: ['customer', 'seller', 'bot'], required: true },
  body:         { type: String, required: true, maxlength: 5000 },
  read:         { type: Boolean, default: false },
}, { timestamps: true })

DirectMessageSchema.index({ conversation: 1, createdAt: 1 })

export default mongoose.models.DirectMessage ||
  mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema)
