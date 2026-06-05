import mongoose, { Schema, Document } from 'mongoose'

export interface ITicketMessage extends Document {
  ticket:     mongoose.Types.ObjectId
  sender:     mongoose.Types.ObjectId
  senderRole: 'customer' | 'agent' | 'admin' | 'bot'
  body:       string
  isInternal: boolean   // internal agent notes — NOT shown to customer
  attachments:string[]  // image/file URLs
  createdAt:  Date
}

const TicketMessageSchema = new Schema<ITicketMessage>({
  ticket:     { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
  sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['customer','agent','admin','bot'], required: true },
  body:       { type: String, required: true, maxlength: 10000 },
  isInternal: { type: Boolean, default: false },
  attachments:[{ type: String }],
}, { timestamps: true })

TicketMessageSchema.index({ ticket: 1, createdAt: 1 })

export default mongoose.models.TicketMessage ||
  mongoose.model<ITicketMessage>('TicketMessage', TicketMessageSchema)
