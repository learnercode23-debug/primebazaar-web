import mongoose, { Schema, Document } from 'mongoose'

export type PricingRuleType = 'competitor' | 'demand' | 'time' | 'inventory'

export interface IPricingRule extends Document {
  key: string
  name: string
  type: PricingRuleType
  enabled: boolean
  description: string
  createdAt: Date
  updatedAt: Date
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['competitor', 'demand', 'time', 'inventory'], required: true },
    enabled: { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.PricingRule ||
  mongoose.model<IPricingRule>('PricingRule', PricingRuleSchema)
