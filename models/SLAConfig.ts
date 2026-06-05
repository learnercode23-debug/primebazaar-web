/**
 * SLAConfig — singleton document configuring how long sellers have
 * to accept and ship each order, and what happens when they miss the deadline.
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface ISLAConfig extends Document {
  acceptHours:    number   // seller must ACCEPT within this many hours (default 24)
  shipDays:       number   // seller must SHIP within this many days (default 3)
  onAcceptBreach: 'cancel' | 'reassign'  // auto-cancel or auto-reassign on accept breach
  onShipBreach:   'flag'   | 'cancel'    // flag or cancel on ship breach
  notifyAdmin:    boolean  // send admin email/notification on every breach
  updatedBy:      mongoose.Types.ObjectId | null
  updatedAt:      Date
}

const SLAConfigSchema = new Schema<ISLAConfig>(
  {
    acceptHours:    { type: Number, default: 24, min: 1 },
    shipDays:       { type: Number, default: 3,  min: 1 },
    onAcceptBreach: { type: String, enum: ['cancel', 'reassign'], default: 'reassign' },
    onShipBreach:   { type: String, enum: ['flag', 'cancel'],     default: 'flag' },
    notifyAdmin:    { type: Boolean, default: true },
    updatedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export default mongoose.models.SLAConfig ||
  mongoose.model<ISLAConfig>('SLAConfig', SLAConfigSchema)
