import mongoose, { Schema, Document } from 'mongoose'

export interface ISellerBrand extends Document {
  seller: mongoose.Types.ObjectId
  brandName: string
  tagline?: string
  story?: string
  logoUrl?: string
  bannerUrl?: string
  websiteUrl?: string
  contactEmail?: string
  features: string[]
  createdAt: Date
  updatedAt: Date
}

const SellerBrandSchema = new Schema<ISellerBrand>(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    brandName: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    story: { type: String },
    logoUrl: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    features: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.SellerBrand ||
  mongoose.model<ISellerBrand>('SellerBrand', SellerBrandSchema)
