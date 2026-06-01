import mongoose, { Schema, Document } from 'mongoose'

export interface IDeliveryAgent extends Document {
  user: mongoose.Types.ObjectId      // Linked User account (role: 'delivery')
  name: string
  phone: string
  vehicleNumber?: string
  assignedZones: string[]            // Pincodes / areas this agent covers
  isActive: boolean
  totalDeliveries: number
  totalCashCollected: number         // Lifetime cash collected
  pendingRemittance: number          // Cash not yet handed to company
  createdAt: Date
}

const DeliveryAgentSchema = new Schema<IDeliveryAgent>({
  user:               { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name:               { type: String, required: true },
  phone:              { type: String, required: true },
  vehicleNumber:      { type: String },
  assignedZones:      [{ type: String }],
  isActive:           { type: Boolean, default: true },
  totalDeliveries:    { type: Number, default: 0 },
  totalCashCollected: { type: Number, default: 0 },
  pendingRemittance:  { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.DeliveryAgent ||
  mongoose.model<IDeliveryAgent>('DeliveryAgent', DeliveryAgentSchema)
