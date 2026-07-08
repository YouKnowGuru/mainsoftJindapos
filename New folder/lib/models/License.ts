import { Schema, model, Document, Types } from 'mongoose';
import { encrypt, decrypt } from '@/src/utils/encryption';

export interface LicenseDocument extends Document {
  licenseKey: string;
  deviceId: string;
  plan: string;
  expiryDate: string;
  maxUsers: number;
  lastVerified: string;
  activationSecret?: string;
}

declare interface LicenseSchema {
  licenseKey: string;
  deviceId: string;
  plan: string;
  expiryDate: string;
  maxUsers: number;
  lastVerified: string;
  activationSecret?: string;
}

const LicenseSchema = new Schema<LicenseDocument, model<LicenseSchema>>({
  licenseKey: {
    type: String,
    required: true,
    set: v => encrypt(v),
    get: v => decrypt(v)
  },
  deviceId: {
    type: String,
    required: true,
    set: v => encrypt(v),
    get: v => decrypt(v)
  },
  plan: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  maxUsers: {
    type: Number,
    required: true
  },
  lastVerified: {
    type: Date,
    required: true
  },
  activationSecret: {
    type: String
  }
});

export const License = model<LicenseDocument>('License', LicenseSchema);

// Add encryption middleware
LicenseSchema.pre('save', function(this: Document, next) {
  const license = this;
  
  // Encrypt sensitive fields
  license.set('licenseKey', encrypt(license.get('licenseKey')));
  license.set('deviceId', encrypt(license.get('deviceId')));
  if (license.get('activationSecret')) {
    license.set('activationSecret', encrypt(license.get('activationSecret')));
  }

  next();
});