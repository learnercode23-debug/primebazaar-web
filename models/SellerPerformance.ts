/**
 * SellerPerformance — cached performance metrics per seller.
 * Updated incrementally every time a sub-order status changes.
 * Used by the assignment engine to deprioritize low-rated sellers.
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface ISellerPerformance extends Document {
  seller: mongoose.Types.ObjectId

  // Raw counters
  totalAssigned:   number
  acceptedOnTime:  number   // accepted before acceptDeadline
  acceptedLate:    number   // accepted after acceptDeadline
  shippedOnTime:   number   // shipped before shipDeadline
  shippedLate:     number   // shipped after shipDeadline
  cancelled:       number   // cancelled by seller or auto-cancel
  delivered:       number   // successfully delivered

  // Computed rates (0-1)
  acceptanceRate:    number   // accepted / totalAssigned
  onTimeShipRate:    number   // shippedOnTime / (shippedOnTime + shippedLate)
  cancellationRate:  number   // cancelled / totalAssigned

  // Composite score 0-100:
  // (acceptanceRate * 30) + (onTimeShipRate * 40) + ((1-cancellationRate) * 30)
  overallScore: number

  lastUpdated: Date
}

const SellerPerformanceSchema = new Schema<ISellerPerformance>(
  {
    seller:          { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalAssigned:   { type: Number, default: 0 },
    acceptedOnTime:  { type: Number, default: 0 },
    acceptedLate:    { type: Number, default: 0 },
    shippedOnTime:   { type: Number, default: 0 },
    shippedLate:     { type: Number, default: 0 },
    cancelled:       { type: Number, default: 0 },
    delivered:       { type: Number, default: 0 },
    acceptanceRate:  { type: Number, default: 0 },
    onTimeShipRate:  { type: Number, default: 0 },
    cancellationRate:{ type: Number, default: 0 },
    overallScore:    { type: Number, default: 100 },  // new sellers start at 100
    lastUpdated:     { type: Date, default: Date.now },
  },
  { timestamps: false }
)

/** Recompute rates and overallScore from raw counters. Call after any update. */
SellerPerformanceSchema.methods.recompute = function () {
  const total = this.totalAssigned || 1  // avoid divide-by-zero

  this.acceptanceRate   = (this.acceptedOnTime + this.acceptedLate) / total
  const shipped = this.shippedOnTime + this.shippedLate
  this.onTimeShipRate   = shipped > 0 ? this.shippedOnTime / shipped : 1
  this.cancellationRate = this.cancelled / total

  this.overallScore = Math.round(
    (this.acceptanceRate   * 30) +
    (this.onTimeShipRate   * 40) +
    ((1 - this.cancellationRate) * 30)
  )
  this.lastUpdated = new Date()
}

export default mongoose.models.SellerPerformance ||
  mongoose.model<ISellerPerformance>('SellerPerformance', SellerPerformanceSchema)
