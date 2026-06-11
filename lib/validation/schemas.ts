import { z } from 'zod'

// Strong password schema helper
const strongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// License validation schemas
export const licenseKeySchema = z.object({
  licenseKey: z
    .string()
    .min(1, 'License key is required')
    .regex(
      /^DTS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i,
      'Invalid license key format. Expected: DTS-XXXX-XXXX-XXXX'
    )
    .transform(val => val.toUpperCase()),
  deviceId: z.string().optional(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits').optional(),
  activationSecret: z.string().uuid('Invalid activation secret format').optional(),
  password: z.string().min(1, 'Password is required').optional(),
})

export const createLicenseSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address'),
  companyName: z.string().optional(),
  plan: z.enum(['starter', 'growth', 'enterprise', 'lifetime', 'pro']),
  maxUsers: z.number().optional(),
  expiryDate: z.string().optional(),
})

export const updateLicenseSchema = z.object({
  id: z.string().min(1, 'License ID is required'),
  status: z.enum(['active', 'inactive', 'expired', 'suspended']).optional(),
  expiryDate: z.string().optional(),
})

export const extendLicenseSchema = z.object({
  id: z.string().min(1, 'License ID is required'),
  days: z.number().min(1, 'Days must be at least 1'),
})

// Customer validation schemas
const addressSchema = z.object({
  street: z.string().max(300, 'Street address must be under 300 characters').optional().default(''),
  gewog: z.string().max(100, 'Gewog must be under 100 characters').optional().default(''),
  dzongkhag: z.string().max(100, 'Dzongkhag must be under 100 characters').optional().default(''),
})

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
})

export const updateCustomerSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
})

// Update validation schemas
export const createUpdateSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  notes: z.string().min(1, 'Release notes are required'),
  downloadUrl: z.string().url('Invalid download URL'),
  isLatest: z.boolean().default(false),
  // electron-updater YAML fields
  fileUrl: z.string().optional(),
  fileSize: z.number().optional(),
  fileSha512: z.string().optional(),
  releaseDate: z.string().optional(),
})

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

// Admin login schema - now uses strong password validation
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: strongPasswordSchema,
})

// Registration password schema (for user registration)
export const registrationPasswordSchema = strongPasswordSchema

// Types
export type LicenseKeyInput = z.infer<typeof licenseKeySchema>
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>
export type ExtendLicenseInput = z.infer<typeof extendLicenseSchema>
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type CreateUpdateInput = z.infer<typeof createUpdateSchema>
export type ContactFormInput = z.infer<typeof contactFormSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
