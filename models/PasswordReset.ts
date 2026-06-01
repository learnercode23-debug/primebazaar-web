import mongoose, { Schema, Document } from 'mongoose'

export interface IPasswordReset extends Document {
  email: string
  otp: string
  expiresAt: Date
  used: boolean
  attempts: number
  createdAt: Date
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  email:     { type: String, required: true, lowercase: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
  attempts:  { type: Number, default: 0 },
}, { timestamps: true })

PasswordResetSchema.index({ email: 1, createdAt: -1 })
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.PasswordReset ||
  mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema)
