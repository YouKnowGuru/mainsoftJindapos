// ============================================
// DHISUM TSEYIG - Type Definitions
// ============================================

// User Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
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

export interface Contact {
  id: number;
  type: ContactType;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  currentBalance: number;
  gstNumber?: string;
  isActive: boolean;
  accountId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  type: ContactType;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  creditDays?: number;
  openingBalance?: number;
  gstNumber?: string;
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
export type TransactionType = 'sale' | 'purchase' | 'receipt' | 'payment' | 'transfer' | 'adjustment' | 'journal';
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
  }>;
  paymentMode: PaymentMode;
  discountAmount?: number;
  notes?: string;
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
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessTagline?: string;
  businessLogo?: string;
  customerName?: string;
  customerAddress?: string;
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
}

export interface PrintReceiptData {
  invoiceNo: string;
  date: string;
  businessName: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMode: string;
  isDuplicate?: boolean;
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
