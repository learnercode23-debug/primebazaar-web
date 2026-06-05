import mongoose, { Schema, Document } from 'mongoose'

export type TicketStatus   = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketCategory = 'order' | 'payment' | 'shipping' | 'return' | 'product' | 'account' | 'other'

export interface ISupportTicket extends Document {
  ticketNumber:   string
  customer:       mongoose.Types.ObjectId
  order?:         mongoose.Types.ObjectId
  category:       TicketCategory
  subject:        string
  description:    string
  status:         TicketStatus
  priority:       TicketPriority
  assignedAgent?: mongoose.Types.ObjectId
  tags:           string[]
  csat?:          number      // 1–5 customer satisfaction rating
  firstResponseAt?: Date
  resolvedAt?:    Date
  closedAt?:      Date
  createdAt:      Date
  updatedAt:      Date
}

const SupportTicketSchema = new Schema<ISupportTicket>({
  ticketNumber:   { type: String, unique: true },
  customer:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  order:          { type: Schema.Types.ObjectId, ref: 'Order' },
  category:       { type: String, enum: ['order','payment','shipping','return','product','account','other'], required: true },
  subject:        { type: String, required: true, maxlength: 200 },
  description:    { type: String, required: true, maxlength: 5000 },
  status:         { type: String, enum: ['open','in_progress','waiting_customer','resolved','closed'], default: 'open' },
  priority:       { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  assignedAgent:  { type: Schema.Types.ObjectId, ref: 'User' },
  tags:           [{ type: String }],
  csat:           { type: Number, min: 1, max: 5 },
  firstResponseAt:{ type: Date },
  resolvedAt:     { type: Date },
  closedAt:       { type: Date },
}, { timestamps: true })

SupportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = 'TKT-' + Date.now().toString(36).toUpperCase().slice(-6)
  }
  next()
})

SupportTicketSchema.index({ customer: 1, status: 1, createdAt: -1 })
SupportTicketSchema.index({ assignedAgent: 1, status: 1 })
SupportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 })

export default mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema)
