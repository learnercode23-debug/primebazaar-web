import mongoose, { Schema, Document } from 'mongoose'

export interface IABVariant {
  name: string
  visitors: number
  conversions: number
}

export interface IABTest extends Document {
  name: string
  metric: string
  status: 'running' | 'paused' | 'completed'
  variantA: IABVariant
  variantB: IABVariant
  winner?: 'A' | 'B' | null
  createdBy?: mongoose.Types.ObjectId
  startDate: Date
  createdAt: Date
  updatedAt: Date
}

const VariantSchema = new Schema<IABVariant>(
  {
    name: { type: String, required: true },
    visitors: { type: Number, default: 0, min: 0 },
    conversions: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const ABTestSchema = new Schema<IABTest>(
  {
    name: { type: String, required: true, trim: true },
    metric: { type: String, required: true, trim: true },
    status: { type: String, enum: ['running', 'paused', 'completed'], default: 'running' },
    variantA: { type: VariantSchema, required: true },
    variantB: { type: VariantSchema, required: true },
    winner: { type: String, enum: ['A', 'B', null], default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export default mongoose.models.ABTest || mongoose.model<IABTest>('ABTest', ABTestSchema)
