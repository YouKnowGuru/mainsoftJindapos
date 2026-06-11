import mongoose, { Schema, Document } from 'mongoose'

export interface IUpdate extends Document {
  version: string
  notes: string
  downloadUrl: string
  isLatest: boolean
  status: 'draft' | 'published' | 'blocked' | 'rollbacked'
  rolloutPercent: number
  forced: boolean
  // Fields for electron-updater YAML
  fileUrl: string
  fileSize: number
  fileSha512: string
  releaseDate: Date
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
    status: {
      type: String,
      enum: ['draft', 'published', 'blocked', 'rollbacked'],
      default: 'draft',
    },
    rolloutPercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    forced: {
      type: Boolean,
      default: false,
    },
    // Fields for electron-updater YAML
    fileUrl: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileSha512: {
      type: String,
      default: '',
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
UpdateSchema.index({ isLatest: 1 })
UpdateSchema.index({ status: 1 })
UpdateSchema.index({ createdAt: -1 })

export default mongoose.models.Update || mongoose.model<IUpdate>('Update', UpdateSchema)
