/**
 * CODVerification — stores OTP codes for confirming COD orders.
 * One record per order attempt; expires in 10 minutes.
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface ICODVerification extends Document {
  email:     string
  otp:       string
  orderId?:  string   // set after order is created (for reference)
  expiresAt: Date
  verified:  boolean
  attempts:  number   // brute-force protection
  createdAt: Date
}

const CODVerificationSchema = new Schema<ICODVerification>(
  {
    email:     { type: String, required: true, index: true },
    otp:       { type: String, required: true },
    orderId:   { type: String },
    expiresAt: { type: Date, required: true },
    verified:  { type: Boolean, default: false },
    attempts:  { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Auto-delete expired records
CODVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.CODVerification ||
  mongoose.model<ICODVerification>('CODVerification', CODVerificationSchema)
