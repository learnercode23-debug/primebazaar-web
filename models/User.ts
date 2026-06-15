import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface ISavedAddress {
  _id?: mongoose.Types.ObjectId
  label: string
  isDefault: boolean
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
}

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  googleId?: string
  role: 'customer' | 'seller' | 'admin' | 'delivery'
  avatar?: string
  phone?: string
  savedAddresses: ISavedAddress[]
  wishlist: mongoose.Types.ObjectId[]
  recentlyViewed: mongoose.Types.ObjectId[]
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  storeCredit: number
  membershipTier: 'standard' | 'prime'
  membershipExpiresAt?: Date
  stripeCustomerId?: string
  isActive: boolean
  emailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpiry?: Date
  notificationPrefs: {
    orderUpdates: boolean
    promotions: boolean
    newArrivals: boolean
  }
  expoPushToken?: string   // Expo push token — set by the mobile app after login
  referralCode?: string
  referredBy?: mongoose.Types.ObjectId
  lastSeen?: Date          // updated on authenticated activity — powers "active now"
  createdAt: Date
  comparePassword(password: string): Promise<boolean>
}

const SavedAddressSchema = new Schema<ISavedAddress>({
  label: { type: String, default: 'Home' },
  isDefault: { type: Boolean, default: false },
  name: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'US' },
  phone: { type: String, required: true },
})

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8 },
    googleId: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ['customer', 'seller', 'admin', 'delivery'], default: 'customer' },
    avatar: { type: String },
    phone: { type: String },
    savedAddresses: [SavedAddressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    recentlyViewed: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    address: {
      street:  { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: 'Nepal' },
    },
    storeCredit: { type: Number, default: 0 },
    membershipTier: { type: String, enum: ['standard', 'prime'], default: 'standard' },
    membershipExpiresAt: { type: Date },
    stripeCustomerId: { type: String },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },
    expoPushToken: { type: String },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastSeen: { type: Date },
    notificationPrefs: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false
  return bcrypt.compare(password, this.password)
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
