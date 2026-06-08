/**
 * DeliveryProof — photo evidence captured by the delivery agent at the doorstep.
 *
 * Created immediately after OTP verification succeeds.
 * Seller/Admin then confirms or disputes the proof.
 * Immutable once created (append-only audit log for actions).
 */
import mongoose, { Schema, Document } from 'mongoose'

export type PODStatus = 'pending' | 'confirmed' | 'disputed'

export interface IAuditEntry {
  action:    string
  userId:    mongoose.Types.ObjectId
  timestamp: Date
  note?:     string
}

export interface IDeliveryProof extends Document {
  order:      mongoose.Types.ObjectId
  agent:      mongoose.Types.ObjectId
  photoUrl:   string           // Cloudinary secure URL
  photoPublicId?: string       // Cloudinary public ID (for deletion)

  // Capture metadata — set server-side, cannot be faked
  capturedAt: Date
  latitude?:  number
  longitude?: number
  locationFlagged:    boolean  // true if capture was >2 km from delivery address
  distanceKm?:        number   // calculated distance from delivery address

  // Verification
  otpVerified:    boolean
  recipientName?: string        // name read from customer at door (optional)

  // Confirmation workflow
  confirmationStatus: PODStatus
  confirmedBy?:  mongoose.Types.ObjectId
  confirmedAt?:  Date
  disputeReason?:string
  disputedBy?:   mongoose.Types.ObjectId
  disputedAt?:   Date

  // Immutable audit trail
  auditLog: IAuditEntry[]

  createdAt: Date
  updatedAt: Date
}

const AuditSchema = new Schema<IAuditEntry>({
  action:    { type: String, required: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  note:      { type: String },
}, { _id: false })

const DeliveryProofSchema = new Schema<IDeliveryProof>(
  {
    order:            { type: Schema.Types.ObjectId, ref: 'Order',        required: true, unique: true },
    agent:            { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    photoUrl:         { type: String, required: true },
    photoPublicId:    { type: String },
    capturedAt:       { type: Date, default: Date.now },
    latitude:         { type: Number },
    longitude:        { type: Number },
    locationFlagged:  { type: Boolean, default: false },
    distanceKm:       { type: Number },
    otpVerified:      { type: Boolean, default: false },
    recipientName:    { type: String },
    confirmationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'disputed'],
      default: 'pending',
    },
    confirmedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt:  { type: Date },
    disputeReason:{ type: String },
    disputedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    disputedAt:   { type: Date },
    auditLog:     [AuditSchema],
  },
  { timestamps: true }
)

DeliveryProofSchema.index({ agent: 1, createdAt: -1 })
DeliveryProofSchema.index({ confirmationStatus: 1 })

export default mongoose.models.DeliveryProof ||
  mongoose.model<IDeliveryProof>('DeliveryProof', DeliveryProofSchema)
