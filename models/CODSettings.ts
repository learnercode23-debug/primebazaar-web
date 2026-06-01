import mongoose, { Schema, Document } from 'mongoose'

/**
 * Global COD configuration — one document, managed by admin.
 * Controls eligibility, fees, and serviceable areas.
 */
export interface ICODSettings extends Document {
  maxOrderValue: number          // Block COD above this amount (e.g. Rs.50,000)
  handlingFee: number            // Extra fee added to COD orders (e.g. Rs.50)
  handlingFeeType: 'fixed' | 'percentage'
  isEnabled: boolean             // Global COD on/off switch
  serviceablePincodes: string[]  // Empty = all pincodes allowed
  blockedCategories: mongoose.Types.ObjectId[]  // COD not available for these
  otpRequired: boolean           // Require phone OTP before placing COD order
  maxDailyOrdersPerCustomer: number  // Risk control
  updatedBy: mongoose.Types.ObjectId
  updatedAt: Date
}

const CODSettingsSchema = new Schema<ICODSettings>({
  maxOrderValue:           { type: Number, default: 50000 },
  handlingFee:             { type: Number, default: 50 },
  handlingFeeType:         { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  isEnabled:               { type: Boolean, default: true },
  serviceablePincodes:     [{ type: String }],
  blockedCategories:       [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  otpRequired:             { type: Boolean, default: false },
  maxDailyOrdersPerCustomer: { type: Number, default: 5 },
  updatedBy:               { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default mongoose.models.CODSettings ||
  mongoose.model<ICODSettings>('CODSettings', CODSettingsSchema)
