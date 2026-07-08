/**
 * Input Validation Schemas using Zod
 * Bank-Level Security Validation
 */

import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

export const IdSchema = z.number().int().positive().max(2147483647);

export const EmailSchema = z.string().email().max(254).toLowerCase().trim();

export const UsernameSchema = z.string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const PasswordSchema = z.string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const MoneyAmountSchema = z.number().nonnegative().max(999999999.99);

// ============================================
// Authentication Validators
// ============================================

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(256),
});

export const CreateUserSchema = z.object({
  username: UsernameSchema,
  email: EmailSchema.optional().nullable(),
  password: PasswordSchema,
  fullName: z.string().min(1).max(100),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export const ChangePasswordSchema = z.object({
  userId: IdSchema,
  oldPassword: z.string().max(256).optional(),
  newPassword: PasswordSchema,
});

// ============================================
// Inventory Validators
// ============================================

export const CreateItemSchema = z.object({
  code: z.string().max(50).optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).default('pcs'),
  purchasePrice: MoneyAmountSchema.default(0),
  sellingPrice: MoneyAmountSchema.default(0),
  reorderLevel: z.number().nonnegative().default(10),
  gstApplicable: z.boolean().default(true),
  gstRate: z.number().min(0).max(100).default(5),
  openingStock: z.number().nonnegative().default(0),
  openingPurchasePrice: MoneyAmountSchema.default(0),
});

export const UpdateItemSchema = z.object({
  id: IdSchema,
  data: CreateItemSchema.partial(),
});

export const StockMovementSchema = z.object({
  itemId: IdSchema.optional().nullable(),
  itemName: z.string().max(200).optional().nullable(),
  quantity: z.number().positive().max(1000000),
  purchasePrice: MoneyAmountSchema.default(0),
  sellingPrice: MoneyAmountSchema.optional().nullable(),
  gstApplicable: z.boolean().optional(),
  gstRate: z.number().min(0).max(100).optional().nullable(),
  supplierId: IdSchema.optional().nullable(),
  paymentMode: z.enum(['cash', 'bank', 'credit', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']).default('cash'),
  type: z.enum(['in', 'out']).default('in'),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ============================================
// Sales / POS Validators
// ============================================

export const SaleItemSchema = z.object({
  itemId: IdSchema,
  quantity: z.number().positive().max(10000),
  unitPrice: MoneyAmountSchema,
  price: MoneyAmountSchema.optional(), // kept for backward compatibility
  discount: z.number().nonnegative().max(100).default(0),
  gstRate: z.number().min(0).max(100).default(5),
  description: z.string().max(1000).optional().nullable(),
});

export const SaleDataSchema = z.object({
  customerId: IdSchema.nullable().optional(),
  items: z.array(SaleItemSchema).min(1).max(100),
  paymentMode: z.enum(['cash', 'bank', 'credit', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
  discountAmount: MoneyAmountSchema.default(0),
  notes: z.string().max(1000).optional().nullable(),
  taxType: z.enum(['standard', 'domestic']).default('standard'),
});

// ============================================
// Contact Validators
// ============================================

export const CreateContactSchema = z.object({
  type: z.enum(['customer', 'supplier']),
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().min(1, 'Phone number is required').max(20),
  email: z.string().max(254).email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(), // legacy
  addressStructured: z.object({
    street: z.string().max(300).optional().nullable(),
    gewog: z.string().max(100).optional().nullable(),
    dzongkhag: z.string().max(100).optional().nullable(),
  }).optional().nullable(),
  creditLimit: MoneyAmountSchema.default(0),
  creditDays: z.number().int().nonnegative().max(365).default(0),
  openingBalance: MoneyAmountSchema.default(0),
  gstNumber: z.string().max(50).optional().nullable(),
});

export const UpdateContactSchema = z.object({
  id: IdSchema,
  data: CreateContactSchema.partial(),
});

// ============================================
// Transaction Validators
// ============================================

export const ReceiveMoneySchema = z.object({
  contactId: IdSchema.nullable(),
  accountId: IdSchema.nullable().optional(),
  amount: MoneyAmountSchema,
  paymentMode: z.enum(['cash', 'bank', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
  reference: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  date: DateStringSchema,
});

export const PayMoneySchema = z.object({
  contactId: IdSchema.nullable(),
  accountId: IdSchema.nullable().optional(),
  amount: MoneyAmountSchema,
  paymentMode: z.enum(['cash', 'bank', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
  reference: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  date: DateStringSchema,
});

export const VoidTransactionSchema = z.object({
  transactionId: IdSchema,
  reason: z.string().min(1).max(500),
});

// ============================================
// GST Validators
// ============================================

export const GSTPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

// ============================================
// Settings Validators
// ============================================

export const ClosePeriodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const SettingKeySchema = z.string().max(100).regex(/^[a-zA-Z0-9_]+$/);

// ============================================
// Cloud Backup Validators
// ============================================

export const CloudBackupSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['30min', 'hourly', 'daily']),
  targets: z.object({
    googleDrive: z.boolean(),
    mega: z.boolean(),
  }),
});

export const MegaCredentialsSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(256),
});

// ============================================
// SaaS API Request Validator
// ============================================

export const SaaSRequestSchema = z.object({
  url: z.string().url().max(2000),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  body: z.any().optional(),
  headers: z.record(z.string(), z.string()).default({}),
});

// Type exports
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
