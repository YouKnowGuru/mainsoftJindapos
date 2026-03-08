import mongoose, { Schema, Document } from 'mongoose'

export interface IUpdate extends Document {
  version: string
  notes: string
  downloadUrl: string
  isLatest: boolean
  createdAt: Date
  updatedAt: Date
}

const UpdateSchema: Schema = new Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
    },
    notes: {
      type: String,
      required: true,
    },
    downloadUrl: {
      type: String,
      required: true,
    },
    isLatest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
UpdateSchema.index({ isLatest: 1 })
UpdateSchema.index({ createdAt: -1 })

export default mongoose.models.Update || mongoose.model<IUpdate>('Update', UpdateSchema)
