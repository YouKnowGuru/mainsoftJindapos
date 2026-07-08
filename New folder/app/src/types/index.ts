// ============================================
// JINDA - Type Definitions
// ============================================

// User Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}

// Contact Types
export type ContactType = 'customer' | 'supplier';

export interface ContactAddress {
  street?: string;
  gewog?: string;
  dzongkhag?: string;
}

export interface Contact {
  id: number;
  type: ContactType;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string; // legacy, kept for backward compatibility
  addressStructured?: ContactAddress;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  currentBalance: number;
  gstNumber: string;
  isActive: boolean;
  accountId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  type: ContactType;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string; // legacy
  addressStructured?: ContactAddress;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  gstNumber: string;
}

// Item Types
export interface Item {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  averageCost: number;
  quantityInStock: number;
  reorderLevel: number;
  gstApplicable: boolean;
  gstRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemData {
  code?: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  gstApplicable?: boolean;
  gstRate?: number;
  openingStock?: number;
  openingPurchasePrice?: number;
}

// Transaction Types
export type TransactionType = 'sale' | 'purchase' | 'receipt' | 'payment' | 'transfer' | 'adjustment' | 'journal' | 'refund';
export type PaymentMode = 'cash' | 'bank' | 'credit' | 'card' | 'mBOB' | 'BNB' | 'TPay' | 'DrukPNB' | 'BDBL' | 'DKBank';
export type TransactionStatus = 'draft' | 'completed' | 'void';

export interface Transaction {
  id: number;
  transactionNo: string;
  type: TransactionType;
  date: string;
  reference?: string;
  contactId?: number;
  contactName?: string;
  description: string;
  totalAmount: number;
  gstAmount: number;
  discountAmount: number;
  netAmount: number;
  paymentMode?: PaymentMode;
  status: TransactionStatus;
  isVoid: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: number;
  invoiceId?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionLine {
  id: number;
  transactionId: number;
  accountId: number;
  contactId?: number;
  itemId?: number;
  description: string;
  debitAmount: number;
  creditAmount: number;
  gstAmount: number;
  gstType?: 'input' | 'output';
}

// Invoice Types
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface Invoice {
  id: number;
  invoiceNo: string;
  transactionId: number;
  contactId?: number;
  contactName?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: InvoiceStatus;
  isPrinted: boolean;
  printCount: number;
  isVoid: boolean;
  notes?: string;
  terms?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

// POS Types
export interface CartItem {
  itemId: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

export interface SaleData {
  customerId?: number;
  items: Array<{
    itemId: number;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    description?: string;
  }>;
  paymentMode: PaymentMode;
  discountAmount?: number;
  notes?: string;
  taxType?: 'standard' | 'domestic';
}

// Stock Types
export interface ItemUnit {
  id: number;
  name: string;
  created_at: string;
}

export interface ItemCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface StockMovement {
  id: number;
  itemId: number;
  transactionId?: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface AddStockData {
  itemId?: number;
  itemName?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  gstApplicable?: boolean;
  gstRate?: number;
  supplierId?: number;
  paymentMode: PaymentMode;
  reference?: string;
  notes?: string;
}

// GST Types
export interface GSTSummary {
  month: number;
  year: number;
  gstInput: number;
  gstOutput: number;
  gstPayable: number;
  gstCredit: number;
  taxablePurchases: number;
  taxableSales: number;
  exemptPurchases: number;
  exemptSales: number;
  domesticSales?: number;
  domesticGstOutput?: number;
  standardGstOutput?: number;
  domesticPurchases?: number;
  domesticGstInput?: number;
  standardGstInput?: number;
}

export interface GSTEntry {
  id: number;
  transactionId: number;
  type: 'input' | 'output';
  amount: number;
  rate: number;
  month: number;
  year: number;
  isFiled: boolean;
  filedAt?: string;
  createdAt: string;
}

// Account Types (Chart of Accounts)
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountSubtype =
  | 'current_asset' | 'fixed_asset'
  | 'current_liability' | 'long_term_liability'
  | 'equity'
  | 'revenue' | 'cogs' | 'operating_expense' | 'other_income' | 'other_expense';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  parentId?: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

// Dashboard Types
export interface DashboardData {
  todaySales: number;
  todayExpenses: number;
  cashBalance: number;
  bankBalance: number;
  profitToday: number;
  lowStockItems: Item[];
  overdueCustomers: Array<{
    id: number;
    name: string;
    currentBalance: number;
    totalDue: number;
    daysOverdue: number;
  }>;
  recentTransactions: Transaction[];
  monthlySales: number;
  monthlyPurchases: number;
  // Chart data
  salesTrend: Array<{ date: string; sales: number; expenses: number }>;
  paymentModes: Array<{ mode: string; amount: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  incomeVsExpense: Array<{ month: string; income: number; expenses: number }>;
}

// Report Types
export interface TrialBalanceItem {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface ProfitLossData {
  revenue: {
    sales: number;
    otherIncome: number;
    total: number;
  };
  expenses: {
    cogs: number;
    operating: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  netProfit: number;
}

export interface BalanceSheetData {
  assets: {
    current: Array<{ name: string; balance: number }>;
    fixed: Array<{ name: string; balance: number }>;
    total: number;
  };
  liabilities: {
    current: Array<{ name: string; balance: number }>;
    longTerm: Array<{ name: string; balance: number }>;
    total: number;
  };
  equity: Array<{ name: string; balance: number }>;
  totalEquity: number;
}

export interface OutstandingItem {
  id: number;
  name: string;
  type: ContactType;
  creditLimit: number;
  currentBalance: number;
  pendingInvoices: number;
  totalDue: number;
  oldestDueDate?: string;
  daysOverdue: number;
}

export interface StockReportItem {
  id: number;
  code: string;
  name: string;
  category?: string;
  quantityInStock: number;
  averageCost: number;
  sellingPrice: number;
  stockValue: number;
  potentialRevenue: number;
  reorderLevel: number;
  stockStatus: 'low' | 'medium' | 'good';
}

// Settings Types
export interface Settings {
  gstRate: number;
  invoicePrefix: string;
  lastInvoiceNumber: number;
  defaultPaymentMode: PaymentMode;
  lowStockThreshold: number;
  defaultCreditLimit: number;
  defaultCreditDays: number;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  companyName: string;
  tradeLicenseNo?: string;
  taxNo?: string;
  companyAddress?: string;
  companyAddressStreet?: string;
  companyAddressGewog?: string;
  companyAddressDzongkhag?: string;
  companyPhone?: string;
  companyEmail?: string;
}

// Company Types
export interface Company {
  id: number;
  name: string;
  tradeLicenseNo?: string;
  taxNo?: string;
  address?: string;
  addressStreet?: string;
  addressGewog?: string;
  addressDzongkhag?: string;
  phone?: string;
  email?: string;
  defaultGstRate: number;
  invoicePrefix: string;
}

// Ledger Types
export interface LedgerEntry {
  id: number;
  transactionNo: string;
  date: string;
  type: TransactionType;
  paymentMode?: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerData {
  contact: Contact;
  openingBalance: number;
  entries: LedgerEntry[];
  currentBalance: number;
}

// Printing Types
export interface PrintInvoiceData {
  invoiceNo: string;
  date: string;
  businessName: string;
  tradeLicenseNo?: string;
  taxNo?: string;
  businessAddress?: string;
  businessAddressStreet?: string;
  businessAddressGewog?: string;
  businessAddressDzongkhag?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessTagline?: string;
  businessLogo?: string;
  businessSeal?: string;
  businessSignature?: string;
  customerName?: string;
  customerAddress?: string;
  customerAddressStreet?: string;
  customerAddressGewog?: string;
  customerAddressDzongkhag?: string;
  customerPhone?: string;
  customerGst?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    gstAmount: number;
    total: number;
  }>;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: string;
  amountPaid: number;
  balanceDue: number;
  isDuplicate?: boolean;
  notes?: string;
  terms?: string;
  taxType?: 'standard' | 'domestic';
}

export interface PrintReceiptData {
  invoiceNo: string;
  date: string;
  businessName: string;
  businessTagline?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxNo?: string;
  businessSeal?: string;
  businessSignature?: string;
  customerName?: string;
  customerPhone?: string;
  customerGst?: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  gstAmount: number;
  discountAmount?: number;
  total: number;
  paymentMode: string;
  isDuplicate?: boolean;
  notes?: string;
  terms?: string;
  taxType?: 'standard' | 'domestic';
}

// API Response Types
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}

// Transaction Form Data
export interface ReceiveMoneyData {
  contactId?: number;
  accountId?: number;
  amount: number;
  paymentMode: PaymentMode;
  date: string;
  reference?: string;
  description?: string;
}

export interface PayMoneyData {
  contactId?: number;
  accountId?: number;
  amount: number;
  paymentMode: PaymentMode;
  date: string;
  reference?: string;
  description?: string;
}

export interface TransferData {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
}

// Cloud Backup Types
export interface CloudBackupSettings {
  enabled: boolean;
  frequency: '30min' | 'hourly' | 'daily';
  targets: {
    googleDrive: boolean;
    mega: boolean;
  };
}

export interface BackupLog {
  id: string;
  date: string;
  status: 'success' | 'failed' | 'in_progress';
  storage: string[];
  fileSize?: number;
  fileName?: string;
  error?: string;
  duration?: number;
}

export interface CloudBackupFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  provider: 'drive' | 'mega';
}

// ============================================
// NEW FEATURE TYPES
// ============================================

// Purchase Orders
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';
export interface PurchaseOrder {
  id: number;
  poNo: string;
  supplierId: number;
  supplierName?: string;
  date: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  notes?: string;
  items: PurchaseOrderItem[];
  transactionId?: number;
  taxType?: 'standard' | 'domestic';
  createdAt: string;
}
export interface PurchaseOrderItem {
  id: number;
  poId: number;
  itemId: number;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  sellingPrice?: number;
}
export interface CreatePurchaseOrderData {
  supplierId: number;
  date: string;
  expectedDate?: string;
  notes?: string;
  taxType?: 'standard' | 'domestic';
  items: Array<{ itemId: number; quantity: number; unitPrice: number; gstRate?: number; sellingPrice?: number }>;
}

// Quotations
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'converted' | 'expired' | 'cancelled';
export interface Quotation {
  id: number;
  quoteNo: string;
  customerId: number;
  customerName?: string;
  date: string;
  expiryDate?: string;
  status: QuotationStatus;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  items: QuotationItem[];
  createdAt: string;
}
export interface QuotationItem {
  id: number;
  quoteId: number;
  itemId: number;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}
export interface CreateQuotationData {
  customerId: number;
  date: string;
  expiryDate?: string;
  notes?: string;
  items: Array<{ itemId: number; quantity: number; unitPrice: number; gstRate?: number }>;
}

// Held Carts
export interface HeldCart {
  id: number;
  cartName: string;
  customerId?: number;
  customerName?: string;
  items: HeldCartItem[];
  createdAt: string;
}
export interface HeldCartItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

// Refunds
export type RefundStatus = 'completed' | 'pending';
export interface Refund {
  id: number;
  refundNo: string;
  originalTransactionId: number;
  customerId?: number;
  customerName?: string;
  date: string;
  reason: string;
  refundMode: PaymentMode;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: RefundStatus;
  notes?: string;
  items: RefundItem[];
  createdAt: string;
}
export interface RefundItem {
  itemId: number;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  totalAmount: number;
}
export interface CreateRefundData {
  originalTransactionId: number;
  customerId?: number;
  date: string;
  reason: string;
  refundMode: PaymentMode;
  notes?: string;
  items: Array<{ itemId: number; quantity: number; unitPrice: number; gstRate?: number }>;
}

// Expenses
export interface Expense {
  id: number;
  expenseNo: string;
  date: string;
  category: string;
  amount: number;
  paymentMode?: string;
  vendor?: string;
  description?: string;
  receiptPath?: string;
  accountId?: number;
  transactionId?: number;
  createdAt: string;
}
export interface CreateExpenseData {
  date: string;
  category: string;
  amount: number;
  paymentMode?: string;
  vendor?: string;
  description?: string;
  accountId: number;
}

// Recurring Transactions
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export interface RecurringTransaction {
  id: number;
  name: string;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  accountId: number;
  accountName?: string;
  contactId?: number;
  contactName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateRecurringData {
  name: string;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  accountId: number;
  contactId?: number;
  description?: string;
}

// Branches
export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}
export interface CreateBranchData {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
}

// Employees
export interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  salary: number;
  joinDate?: string;
  isActive: boolean;
  pf_rate?: number;
  gis_amount?: number;
  tds_rate?: number;
  hc_rate?: number;
  createdAt: string;
}
export interface CreateEmployeeData {
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  salary?: number;
  joinDate?: string;
  pf_rate?: number;
  gis_amount?: number;
  tds_rate?: number;
  hc_rate?: number;
}

// Barcode Mappings
export interface BarcodeMapping {
  id: number;
  barcode: string;
  itemId: number;
  itemName?: string;
  createdAt: string;
}

// Price Lists
export interface PriceList {
  id: number;
  name: string;
  customerType?: string;
  isActive: boolean;
  items: PriceListItem[];
  createdAt: string;
}
export interface PriceListItem {
  id: number;
  priceListId: number;
  itemId: number;
  itemName?: string;
  price: number;
}
export interface CreatePriceListData {
  name: string;
  customerType?: string;
  items: Array<{ itemId: number; price: number }>;
}

// Aged Receivables/Payables
export interface AgedEntry {
  id: number;
  name: string;
  current: number;
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}
export interface AgedReport {
  entries: AgedEntry[];
  totalCurrent: number;
  total31_60: number;
  total61_90: number;
  totalOver90: number;
  grandTotal: number;
  asOfDate: string;
}

// Split Payments
export interface SplitPayment {
  mode: PaymentMode;
  amount: number;
}
export interface CreateSaleWithSplitData {
  customerId?: number;
  items: Array<{ itemId: number; quantity: number; unitPrice: number; gstRate?: number }>;
  discountAmount?: number;
  payments: SplitPayment[];
  notes?: string;
}

// Tiered Pricing
export interface ItemTieredPricing {
  itemId: number;
  retailPrice: number;
  wholesalePrice: number;
  dealerPrice: number;
}


export interface BackupProgress {
  stage: string;
  percent: number;
  message: string;
}
