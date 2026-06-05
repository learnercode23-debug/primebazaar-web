/**
 * PaymentSetting — admin-managed payment configuration.
 * Singleton document (one per platform).
 * Stores the Khalti personal QR image URL and account info.
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface IPaymentSetting extends Document {
  khaltiQrImageUrl:  string   // Cloudinary URL of the QR image
  khaltiPhoneNumber: string   // displayed to customer for reference
  khaltiAccountName: string   // displayed to customer
  isKhaltiQrEnabled: boolean  // show/hide the option
  updatedBy: mongoose.Types.ObjectId
  updatedAt: Date
}

const PaymentSettingSchema = new Schema<IPaymentSetting>(
  {
    khaltiQrImageUrl:  { type: String, default: '' },
    khaltiPhoneNumber: { type: String, default: '9801772670' },
    khaltiAccountName: { type: String, default: 'Randhir Sah' },
    isKhaltiQrEnabled: { type: Boolean, default: true },
    updatedBy:         { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.models.PaymentSetting ||
  mongoose.model<IPaymentSetting>('PaymentSetting', PaymentSettingSchema)
