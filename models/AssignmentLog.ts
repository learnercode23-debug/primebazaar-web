/**
 * AssignmentLog — immutable audit trail of every seller assignment.
 * Records both automatic assignments (on order placement) and
 * manual reassignments (by an admin).
 */
import mongoose, { Schema, Document } from 'mongoose'

export type AssignmentAction = 'auto_assigned' | 'manual_reassigned'

export interface IAssignmentLog extends Document {
  subOrder:    mongoose.Types.ObjectId          // the sub-order that was assigned
  order:       mongoose.Types.ObjectId          // parent order
  action:      AssignmentAction
  fromSeller:  mongoose.Types.ObjectId | null   // null on first assignment
  toSeller:    mongoose.Types.ObjectId
  rule:        string   // e.g. 'lowest_price', 'round_robin', 'manual', …
  reason:      string   // human-readable explanation stored for transparency
  performedBy: mongoose.Types.ObjectId | null   // admin userId for manual reassigns
  timestamp:   Date
}

const AssignmentLogSchema = new Schema<IAssignmentLog>(
  {
    subOrder:    { type: Schema.Types.ObjectId, ref: 'SubOrder', required: true },
    order:       { type: Schema.Types.ObjectId, ref: 'Order',    required: true },
    action:      { type: String, enum: ['auto_assigned', 'manual_reassigned'], required: true },
    fromSeller:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    toSeller:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rule:        { type: String, required: true },
    reason:      { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    timestamp:   { type: Date, default: Date.now },
  },
  { timestamps: false }
)

AssignmentLogSchema.index({ subOrder: 1 })
AssignmentLogSchema.index({ order: 1 })
AssignmentLogSchema.index({ toSeller: 1, timestamp: -1 })

export default mongoose.models.AssignmentLog ||
  mongoose.model<IAssignmentLog>('AssignmentLog', AssignmentLogSchema)
