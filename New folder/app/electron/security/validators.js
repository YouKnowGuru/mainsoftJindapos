"use strict";
/**
 * Input Validation Schemas using Zod
 * Bank-Level Security Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaaSRequestSchema = exports.MegaCredentialsSchema = exports.CloudBackupSettingsSchema = exports.SettingKeySchema = exports.ClosePeriodSchema = exports.GSTPeriodSchema = exports.VoidTransactionSchema = exports.PayMoneySchema = exports.ReceiveMoneySchema = exports.UpdateContactSchema = exports.CreateContactSchema = exports.SaleDataSchema = exports.SaleItemSchema = exports.StockMovementSchema = exports.UpdateItemSchema = exports.CreateItemSchema = exports.ChangePasswordSchema = exports.CreateUserSchema = exports.LoginCredentialsSchema = exports.MoneyAmountSchema = exports.DateStringSchema = exports.PasswordSchema = exports.UsernameSchema = exports.EmailSchema = exports.IdSchema = void 0;
var zod_1 = require("zod");
// ============================================
// Common Validators
// ============================================
exports.IdSchema = zod_1.z.number().int().positive().max(2147483647);
exports.EmailSchema = zod_1.z.string().email().max(254).toLowerCase().trim();
exports.UsernameSchema = zod_1.z.string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');
exports.PasswordSchema = zod_1.z.string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
exports.DateStringSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
exports.MoneyAmountSchema = zod_1.z.number().nonnegative().max(999999999.99);
// ============================================
// Authentication Validators
// ============================================
exports.LoginCredentialsSchema = zod_1.z.object({
    username: zod_1.z.string().min(1).max(100),
    password: zod_1.z.string().min(1).max(256),
});
exports.CreateUserSchema = zod_1.z.object({
    username: exports.UsernameSchema,
    email: exports.EmailSchema.optional().nullable(),
    password: exports.PasswordSchema,
    fullName: zod_1.z.string().min(1).max(100),
    role: zod_1.z.enum(['admin', 'staff']).default('staff'),
});
exports.ChangePasswordSchema = zod_1.z.object({
    userId: exports.IdSchema,
    oldPassword: zod_1.z.string().max(256).optional(),
    newPassword: exports.PasswordSchema,
});
// ============================================
// Inventory Validators
// ============================================
exports.CreateItemSchema = zod_1.z.object({
    code: zod_1.z.string().max(50).optional().nullable(),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional().nullable(),
    category: zod_1.z.string().max(100).optional().nullable(),
    unit: zod_1.z.string().max(50).default('pcs'),
    purchasePrice: exports.MoneyAmountSchema.default(0),
    sellingPrice: exports.MoneyAmountSchema.default(0),
    reorderLevel: zod_1.z.number().nonnegative().default(10),
    gstApplicable: zod_1.z.boolean().default(true),
    gstRate: zod_1.z.number().min(0).max(100).default(5),
});
exports.UpdateItemSchema = exports.CreateItemSchema.partial();
exports.StockMovementSchema = zod_1.z.object({
    itemId: exports.IdSchema,
    quantity: zod_1.z.number().positive().max(1000000),
    type: zod_1.z.enum(['in', 'out']),
    reference: zod_1.z.string().max(100).optional().nullable(),
    notes: zod_1.z.string().max(500).optional().nullable(),
});
// ============================================
// Sales / POS Validators
// ============================================
exports.SaleItemSchema = zod_1.z.object({
    itemId: exports.IdSchema,
    quantity: zod_1.z.number().positive().max(10000),
    price: exports.MoneyAmountSchema,
    discount: zod_1.z.number().nonnegative().max(100).default(0),
    gstRate: zod_1.z.number().min(0).max(100).default(5),
});
exports.SaleDataSchema = zod_1.z.object({
    customerId: exports.IdSchema.nullable().optional(),
    items: zod_1.z.array(exports.SaleItemSchema).min(1).max(100),
    paymentMode: zod_1.z.enum(['cash', 'bank', 'credit', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
    discountAmount: exports.MoneyAmountSchema.default(0),
    notes: zod_1.z.string().max(1000).optional().nullable(),
});
// ============================================
// Contact Validators
// ============================================
exports.CreateContactSchema = zod_1.z.object({
    type: zod_1.z.enum(['customer', 'supplier']),
    name: zod_1.z.string().min(1).max(200),
    contactPerson: zod_1.z.string().max(100).optional().nullable(),
    phone: zod_1.z.string().max(20).optional().nullable(),
    email: zod_1.z.string().max(254).optional().nullable(),
    address: zod_1.z.string().max(500).optional().nullable(),
    creditLimit: exports.MoneyAmountSchema.default(0),
    creditDays: zod_1.z.number().int().nonnegative().max(365).default(0),
    openingBalance: exports.MoneyAmountSchema.default(0),
    gstNumber: zod_1.z.string().max(50).optional().nullable(),
});
exports.UpdateContactSchema = exports.CreateContactSchema.partial();
// ============================================
// Transaction Validators
// ============================================
exports.ReceiveMoneySchema = zod_1.z.object({
    contactId: exports.IdSchema.nullable(),
    amount: exports.MoneyAmountSchema,
    paymentMode: zod_1.z.enum(['cash', 'bank', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
    reference: zod_1.z.string().max(100).optional().nullable(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    date: exports.DateStringSchema,
});
exports.PayMoneySchema = zod_1.z.object({
    contactId: exports.IdSchema.nullable(),
    amount: exports.MoneyAmountSchema,
    paymentMode: zod_1.z.enum(['cash', 'bank', 'card', 'upi', 'mBOB', 'BNB', 'TPay', 'DrukPNB', 'BDBL', 'DKBank']),
    reference: zod_1.z.string().max(100).optional().nullable(),
    description: zod_1.z.string().max(1000).optional().nullable(),
    date: exports.DateStringSchema,
});
exports.VoidTransactionSchema = zod_1.z.object({
    transactionId: exports.IdSchema,
    reason: zod_1.z.string().min(1).max(500),
});
// ============================================
// GST Validators
// ============================================
exports.GSTPeriodSchema = zod_1.z.object({
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2000).max(2100),
});
// ============================================
// Settings Validators
// ============================================
exports.ClosePeriodSchema = zod_1.z.object({
    year: zod_1.z.number().int().min(2000).max(2100),
    month: zod_1.z.number().int().min(1).max(12),
});
exports.SettingKeySchema = zod_1.z.string().max(100).regex(/^[a-zA-Z0-9_]+$/);
// ============================================
// Cloud Backup Validators
// ============================================
exports.CloudBackupSettingsSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    frequency: zod_1.z.enum(['30min', 'hourly', 'daily']),
    targets: zod_1.z.object({
        googleDrive: zod_1.z.boolean(),
        mega: zod_1.z.boolean(),
    }),
});
exports.MegaCredentialsSchema = zod_1.z.object({
    email: exports.EmailSchema,
    password: zod_1.z.string().min(1).max(256),
});
// ============================================
// SaaS API Request Validator
// ============================================
exports.SaaSRequestSchema = zod_1.z.object({
    url: zod_1.z.string().url().max(2000),
    method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    body: zod_1.z.any().optional(),
    headers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
});
