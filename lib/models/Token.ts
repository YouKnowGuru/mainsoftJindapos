import mongoose, { Schema, Document } from 'mongoose'

export interface IToken extends Document {
  userId?: mongoose.Types.ObjectId
  licenseId?: mongoose.Types.ObjectId
  token: string
  type: 'verify' | 'reset' | 'license-otp' | 'device-verification'
  // Device verification metadata
  deviceId?: string
  deviceFingerprint?: string
  deviceInfo?: {
    platform: string
    hostname: string
    username: string
  }
  attempts: number
  expiresAt: Date
  createdAt: Date
}

const TokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'PosUser',
      index: true,
    },
    licenseId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'License',
      index: true,
    },
    token: {
      type: String,
      required: true,
      // No global unique — uniqueness is scoped per context via compound indexes below
    },
    type: {
      type: String,
      enum: ['verify', 'reset', 'license-otp', 'device-verification'],
      required: true,
    },
    // Device verification metadata
    deviceId: {
      type: String,
      default: null,
    },
    deviceFingerprint: {
      type: String,
      default: null,
    },
    deviceInfo: {
      platform: String,
      hostname: String,
      username: String,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// TTL index: MongoDB will auto-delete expired tokens (this is the ONLY expiresAt index needed)
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Compound index for license OTP tokens: one active token per (licenseId + type) combination
// This lets two different licenses both hold the same 6-digit OTP without collision
// Using partialFilterExpression instead of sparse for better null handling
TokenSchema.index(
  { licenseId: 1, type: 1, token: 1 },
  {
    unique: true,
    partialFilterExpression: { licenseId: { $exists: true, $ne: null }, type: 'license-otp' }
  }
)

// Compound index for user tokens (verify/reset): one active token per (userId + type)
TokenSchema.index(
  { userId: 1, type: 1, token: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $exists: true, $ne: null }, type: { $in: ['verify', 'reset'] } }
  }
)

// Separate index for token lookups (non-unique, for queries)
TokenSchema.index({ token: 1, type: 1 })

// Index for finding tokens by licenseId
TokenSchema.index({ licenseId: 1, type: 1 })

// Index for finding tokens by userId
TokenSchema.index({ userId: 1, type: 1 })

// Prevent model recompilation in dev
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Token
}

export default mongoose.models.Token || mongoose.model<IToken>('Token', TokenSchema)
