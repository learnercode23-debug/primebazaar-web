/**
 * SellerInventory — tracks which sellers stock which products,
 * at what price and quantity. Used by the assignment engine to
 * pick the best seller when multiple sellers carry the same product.
 */
import mongoose, { Schema, Document } from 'mongoose'

export interface ISellerInventory extends Document {
  product: mongoose.Types.ObjectId
  seller: mongoose.Types.ObjectId
  price: number       // seller's own price (may differ from product.price)
  stock: number       // how many units this seller has
  isActive: boolean   // false = temporarily not selling
  roundRobinCounter: number  // incremented on each round-robin assignment
  createdAt: Date
  updatedAt: Date
}

const SellerInventorySchema = new Schema<ISellerInventory>(
  {
    product:           { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    seller:            { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    price:             { type: Number, required: true, min: 0 },
    stock:             { type: Number, required: true, default: 0, min: 0 },
    isActive:          { type: Boolean, default: true },
    roundRobinCounter: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// One record per seller-product pair
SellerInventorySchema.index({ product: 1, seller: 1 }, { unique: true })
SellerInventorySchema.index({ product: 1, isActive: 1, stock: 1 })

export default mongoose.models.SellerInventory ||
  mongoose.model<ISellerInventory>('SellerInventory', SellerInventorySchema)
