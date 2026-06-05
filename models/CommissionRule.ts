/**
 * CommissionRule — configurable commission rates.
 *
 * Rate resolution order (most specific wins):
 *   product → category → seller → global
 *
 * If no rule matches, the system falls back to Category.commission (default 10%).
 */
import mongoose, { Schema, Document } from 'mongoose'

export type RuleScope = 'product' | 'category' | 'seller' | 'global'
export type RateType  = 'percentage' | 'fixed'

export interface ICommissionRule extends Document {
  scope:       RuleScope
  refId?:      mongoose.Types.ObjectId   // product._id | category._id | seller user._id
  rateType:    RateType                  // percentage of lineTotal OR fixed per item
  rateValue:   number                    // e.g. 12 (%) or 50 (Rs. fixed)
  activeFrom?: Date
  activeTo?:   Date
  isActive:    boolean
  description?: string
  createdBy:   mongoose.Types.ObjectId
  createdAt:   Date
  updatedAt:   Date
}

const CommissionRuleSchema = new Schema<ICommissionRule>(
  {
    scope:      { type: String, enum: ['product','category','seller','global'], required: true },
    refId:      { type: Schema.Types.ObjectId },   // null for global
    rateType:   { type: String, enum: ['percentage','fixed'], default: 'percentage' },
    rateValue:  { type: Number, required: true, min: 0 },
    activeFrom: { type: Date },
    activeTo:   { type: Date },
    isActive:   { type: Boolean, default: true },
    description:{ type: String },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

CommissionRuleSchema.index({ scope: 1, refId: 1, isActive: 1 })

export default mongoose.models.CommissionRule ||
  mongoose.model<ICommissionRule>('CommissionRule', CommissionRuleSchema)
