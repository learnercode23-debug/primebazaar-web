/**
 * AssignmentConfig — stores the active assignment rule (singleton document).
 * Only one document exists; create it if absent.
 */
import mongoose, { Schema, Document } from 'mongoose'

export type AssignmentRule =
  | 'lowest_price'
  | 'highest_rating'
  | 'round_robin'
  | 'nearest'

export interface IAssignmentConfig extends Document {
  rule:      AssignmentRule
  updatedBy: mongoose.Types.ObjectId | null
  updatedAt: Date
}

const AssignmentConfigSchema = new Schema<IAssignmentConfig>(
  {
    rule: {
      type: String,
      enum: ['lowest_price', 'highest_rating', 'round_robin', 'nearest'],
      default: 'lowest_price',
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.AssignmentConfig ||
  mongoose.model<IAssignmentConfig>('AssignmentConfig', AssignmentConfigSchema)
