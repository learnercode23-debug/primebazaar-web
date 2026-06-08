import mongoose, { Schema, Document } from 'mongoose'

export interface IStockAlert extends Document {
  product: mongoose.Types.ObjectId
  email: string
  user?: mongoose.Types.ObjectId
  createdAt: Date
}

const StockAlertSchema = new Schema<IStockAlert>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  user:    { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

StockAlertSchema.index({ product: 1, email: 1 }, { unique: true })

export default mongoose.models.StockAlert || mongoose.model<IStockAlert>('StockAlert', StockAlertSchema)
