import mongoose, { Schema, Document } from 'mongoose'

/**
 * Stores one directional association rule: antecedent(s) → consequent
 * Derived from Apriori algorithm on historical order data.
 *
 * Metrics:
 *  support    = P(A ∩ B) = orders containing both / total orders
 *  confidence = P(B|A)   = orders containing both / orders containing A
 *  lift       = confidence / support(B)  — lift > 1 means positive correlation
 */
export interface IAssociationRule extends Document {
  antecedent: mongoose.Types.ObjectId    // "customers who bought THIS"
  consequent: mongoose.Types.ObjectId    // "also bought THIS"
  support: number                        // 0–1
  confidence: number                     // 0–1
  lift: number                           // > 1 = positive association
  coCount: number                        // raw co-occurrence count
  antecedentCount: number                // raw count of antecedent alone
  totalOrders: number                    // denominator at mining time
  minedAt: Date
}

const AssociationRuleSchema = new Schema<IAssociationRule>(
  {
    antecedent: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    consequent: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    support: { type: Number, required: true },
    confidence: { type: Number, required: true },
    lift: { type: Number, required: true },
    coCount: { type: Number, required: true },
    antecedentCount: { type: Number, required: true },
    totalOrders: { type: Number, required: true },
    minedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// One rule per ordered pair — upsert on re-mine
AssociationRuleSchema.index({ antecedent: 1, consequent: 1 }, { unique: true })
// Fast lookup: "given product X, what goes with it?"
AssociationRuleSchema.index({ antecedent: 1, lift: -1 })

export default mongoose.models.AssociationRule ||
  mongoose.model<IAssociationRule>('AssociationRule', AssociationRuleSchema)
