import mongoose, { Schema, Document } from 'mongoose'

export interface ILicense extends Document {
  licenseKey: string
  customerName: string
  email: string
  companyName?: string
  plan: 'starter' | 'growth' | 'enterprise' | 'lifetime' | 'pro'
  maxUsers: number
  status: 'active' | 'inactive' | 'expired' | 'suspended'
  deviceId?: string
  expiryDate?: Date
  activationDate?: Date
  activationCount: number
  createdAt: Date
  updatedAt: Date
}

const LicenseSchema: Schema = new Schema(
  {
    licenseKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      default: '',
    },
    plan: {
      type: String,
      enum: ['starter', 'growth', 'enterprise', 'lifetime', 'pro'],
      required: true,
    },
    maxUsers: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'suspended'],
      default: 'inactive',
    },
    deviceId: {
      type: String,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    activationDate: {
      type: Date,
      default: null,
    },
    activationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
LicenseSchema.index({ status: 1, plan: 1 })
LicenseSchema.index({ createdAt: -1 })

// During development, Next.js hot-reloading can cause models to be registered multiple times
// or stick to an old version in the `mongoose.models` cache.
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.License
}

export default mongoose.models.License || mongoose.model<ILicense>('License', LicenseSchema)
