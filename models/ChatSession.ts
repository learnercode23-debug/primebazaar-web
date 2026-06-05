import mongoose, { Schema, Document } from 'mongoose'

export interface IChatMessage {
  sender:     mongoose.Types.ObjectId
  senderRole: 'customer' | 'agent' | 'bot'
  body:       string
  createdAt:  Date
}

export interface IChatSession extends Document {
  sessionNumber: string
  customer:  mongoose.Types.ObjectId
  agent?:    mongoose.Types.ObjectId
  mode:      'bot' | 'human'
  status:    'active' | 'waiting_agent' | 'with_agent' | 'closed'
  order?:    mongoose.Types.ObjectId
  messages:  IChatMessage[]
  ticket?:   mongoose.Types.ObjectId    // linked ticket if escalated
  startedAt: Date
  endedAt?:  Date
  createdAt: Date
}

const ChatMessageSchema = new Schema<IChatMessage>({
  sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['customer','agent','bot'], required: true },
  body:       { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },
})

const ChatSessionSchema = new Schema<IChatSession>({
  sessionNumber: { type: String, unique: true },
  customer:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  agent:     { type: Schema.Types.ObjectId, ref: 'User' },
  mode:      { type: String, enum: ['bot','human'], default: 'bot' },
  status:    { type: String, enum: ['active','waiting_agent','with_agent','closed'], default: 'active' },
  order:     { type: Schema.Types.ObjectId, ref: 'Order' },
  messages:  [ChatMessageSchema],
  ticket:    { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
  startedAt: { type: Date, default: Date.now },
  endedAt:   { type: Date },
}, { timestamps: true })

ChatSessionSchema.pre('save', function (next) {
  if (!this.sessionNumber) {
    this.sessionNumber = 'CHAT-' + Date.now().toString(36).toUpperCase().slice(-6)
  }
  next()
})

ChatSessionSchema.index({ customer: 1, status: 1 })
ChatSessionSchema.index({ agent: 1, status: 1 })

export default mongoose.models.ChatSession ||
  mongoose.model<IChatSession>('ChatSession', ChatSessionSchema)
