import mongoose, { Schema, Document } from 'mongoose'

export interface ICustomer extends Document {
  name: string
  email: string
  company?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    company: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
CustomerSchema.index({ createdAt: -1 })
CustomerSchema.index({ name: 'text', email: 'text', company: 'text' })

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)
