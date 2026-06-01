import mongoose, { Schema, Document } from 'mongoose'

/**
 * SECURITY NOTE:
 * Never store full bank account numbers in plain text.
 * In production, use a payout provider's vault (RazorpayX, Khalti, etc.)
 * and store only their tokenized reference + last 4 digits for display.
 *
 * KYC NOTE:
 * Before enabling payouts, verify seller identity (PAN/Citizenship in Nepal,
 * PAN card in India, SSN in USA). This is a legal requirement.
 */
export interface ISellerBankAccount extends Document {
  seller: mongoose.Types.ObjectId
  accountHolderName: string
  bankName: string
  // Store only last 4 digits for display — full number goes to payout provider vault
  accountLast4: string
  // In production: store the provider's vault/token reference, not the actual number
  accountToken?: string
  ifscCode?: string       // India
  routingNumber?: string  // USA
  swiftCode?: string      // International
  mobileWallet?: string   // Nepal: eSewa/Khalti phone number
  walletType?: 'esewa' | 'khalti' | 'bank'
  isVerified: boolean     // Set to true after KYC verification
  isDefault: boolean
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected'
  kycNote?: string
}

const SellerBankAccountSchema = new Schema<ISellerBankAccount>({
  seller:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  accountHolderName: { type: String, required: true },
  bankName:          { type: String, required: true },
  accountLast4:      { type: String, required: true, maxlength: 4 },
  accountToken:      { type: String },
  ifscCode:          { type: String },
  routingNumber:     { type: String },
  swiftCode:         { type: String },
  mobileWallet:      { type: String },
  walletType:        { type: String, enum: ['esewa', 'khalti', 'bank'], default: 'bank' },
  isVerified:        { type: Boolean, default: false },
  isDefault:         { type: Boolean, default: false },
  kycStatus:         { type: String, enum: ['pending', 'submitted', 'verified', 'rejected'], default: 'pending' },
  kycNote:           { type: String },
}, { timestamps: true })

SellerBankAccountSchema.index({ seller: 1 })

export default mongoose.models.SellerBankAccount ||
  mongoose.model<ISellerBankAccount>('SellerBankAccount', SellerBankAccountSchema)
