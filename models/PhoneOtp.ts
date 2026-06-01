import mongoose, { Schema, Document } from 'mongoose'

export interface IPhoneOtp extends Document {
  phone: string      // E.164 format e.g. +9779801234567
  otp: string        // 6-digit code
  expiresAt: Date
  used: boolean
  attempts: number   // prevent brute-force
  createdAt: Date
}

const PhoneOtpSchema = new Schema<IPhoneOtp>(
  {
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Auto-delete expired OTPs after TTL
PhoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.PhoneOtp ||
  mongoose.model<IPhoneOtp>('PhoneOtp', PhoneOtpSchema)
