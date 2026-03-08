import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { format } from 'date-fns';
import type {
  User,
  LoginCredentials,
  LoginResponse,
  Contact,
  CreateContactData,
  Transaction,
  SaleData,
  ReceiveMoneyData,
  PayMoneyData,
  TransferData,
  ApiResponse,
  LedgerData
} from '../types';

import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine, EngineItem } from './AccountingEngineService';

import { AutomationService } from './AutomationService';

/**
 * AccountingService - Core accounting operations with strict double-entry validation
 */
export class AccountingService {
  private db: Database.Database;
  private currentUser: User | null = null;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  login(credentials: LoginCredentials): LoginResponse {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(credentials.username) as any;

      if (!user) {
        return { success: false, message: 'Invalid username or password' };
      }

      const validPassword = bcrypt.compareSync(credentials.password, user.password_hash);

      if (!validPassword) {
        return { success: false, message: 'Invalid username or password' };
      }

      this.currentUser = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
      };

      this.logAudit('LOGIN', 'users', user.id);

      return {
        success: true,
        user: this.currentUser
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed: ' + error.message };
    }
  }

  logout(): void {
    if (this.currentUser) {
      this.logAudit('LOGOUT', 'users', this.currentUser.id);
    }
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  changePassword(data: { userId: number; newPassword: string; oldPassword?: string }): ApiResponse {
    try {
      if (!this.currentUser) {
        return { success: false, message: 'Not authenticated' };
      }

      if (!data.newPassword || data.newPassword.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters long' };
      }

      const targetUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(data.userId) as any;

      if (!targetUser) {
        return { success: false, message: 'User not found' };
      }

      // Security Check: If it's the user changing their own password, OR if a non-admin is trying to change a password
      if (this.currentUser.id === data.userId || this.currentUser.role !== 'admin') {
        // Must provide old password
        if (!data.oldPassword) {
          return { success: false, message: 'Current password is required to change your own password' };
        }

        const validPassword = bcrypt.compareSync(data.oldPassword, targetUser.password_hash);
        if (!validPassword) {
          return { success: false, message: 'Incorrect current password' };
        }
      } else {
        // Admin changing someone else's password - just verify the current user is actually an admin
        if (this.currentUser.role !== 'admin') {
          return { success: false, message: 'Insufficient privileges' };
        }
      }

      const newPasswordHash = bcrypt.hashSync(data.newPassword, 10);

      this.db.prepare(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(newPasswordHash, data.userId);

      this.logAudit('CHANGE_PASSWORD', 'users', data.userId);

      return { success: true, message: 'Password updated successfully' };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { success: false, message: 'Failed to change password: ' + error.message };
    }
  }

  // ============================================
  // CONTACTS (CUSTOMERS & SUPPLIERS)
  // ============================================

  createContact(data: CreateContactData): ApiResponse<Contact> {
    try {
      // Validate required fields
      if (!data.name || !data.type) {
        return { success: false, message: 'Name and type are required' };
      }

      // Get the appropriate parent account
      const parentAccountCode = data.type === 'customer' ? '1300' : '2100';
      const parentAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(parentAccountCode) as any;

      if (!parentAccount) {
        return { success: false, message: 'Parent account not found' };
      }

      // Create sub-account for this contact
      const accountCode = this.generateAccountCode(parentAccountCode);
      const accountName = `${data.name} (${data.type === 'customer' ? 'Customer' : 'Supplier'})`;

      const accountResult = this.db.prepare(`
        INSERT INTO accounts (code, name, type, subtype, parent_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        accountCode,
        accountName,
        data.type === 'customer' ? 'asset' : 'liability',
        data.type === 'customer' ? 'current_asset' : 'current_liability',
        parentAccount.id
      );

      const accountId = accountResult.lastInsertRowid as number;

      // Create contact
      const openingBalance = data.openingBalance || 0;
      const result = this.db.prepare(`
        INSERT INTO contacts 
        (type, name, contact_person, phone, email, address, credit_limit, credit_days, opening_balance, current_balance, gst_number, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type,
        data.name,
        data.contactPerson || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.creditLimit || 50000,
        data.creditDays || 30,
        openingBalance,
        openingBalance,
        data.gstNumber || null,
        accountId
      );

      const contactId = result.lastInsertRowid as number;

      // If opening balance exists, create opening entry
      if (openingBalance !== 0) {
        this.createOpeningBalanceEntry(accountId, openingBalance, data.type);
      }

      this.logAudit('CREATE_CONTACT', 'contacts', contactId, data);

      const contact = this.getContactById(contactId);
      if (!contact) {
        return { success: false, message: 'Failed to retrieve created contact' };
      }
      return {
        success: true,
        data: contact,
        message: `${data.type === 'customer' ? 'Customer' : 'Supplier'} created successfully`
      };
    } catch (error: any) {
      console.error('Create contact error:', error);
      return { success: false, message: 'Failed to create contact: ' + error.message };
    }
  }

  getContactById(id: number): Contact | null {
    try {
      const contact = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
      if (!contact) return null;

      return this.mapContactFromDb(contact);
    } catch (error) {
      console.error('Get contact error:', error);
      return null;
    }
  }

  getContacts(type?: 'customer' | 'supplier'): Contact[] {
    try {
      let query = 'SELECT * FROM contacts WHERE is_active = 1';
      const params: any[] = [];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY name';

      const contacts = this.db.prepare(query).all(...params);
      return contacts.map((c: any) => this.mapContactFromDb(c));
    } catch (error) {
      console.error('Get contacts error:', error);
      return [];
    }
  }

  updateContact(id: number, data: Partial<CreateContactData>): ApiResponse {
    try {
      const sets: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          sets.push(`${dbKey} = ?`);
          values.push(value);
        }
      });

      if (sets.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      values.push(id);

      this.db.prepare(`UPDATE contacts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

      this.logAudit('UPDATE_CONTACT', 'contacts', id, data);

      return { success: true, message: 'Contact updated successfully' };
    } catch (error: any) {
      console.error('Update contact error:', error);
      return { success: false, message: 'Failed to update contact: ' + error.message };
    }
  }

  deleteContact(id: number): ApiResponse {
    try {
      // Prevent deletion if contact has transactions
      this.automation.preventInvalidDeletion('contact', id);

      const contact = this.db.prepare('SELECT account_id FROM contacts WHERE id = ?').get(id) as any;

      this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

      if (contact) {
        this.db.prepare('DELETE FROM accounts WHERE id = ?').run(contact.account_id);
      }

      this.logAudit('DELETE_CONTACT', 'contacts', id);

      return { success: true, message: 'Contact deleted successfully' };
    } catch (error: any) {
      console.error('Delete contact error:', error);
      return { success: false, message: 'Failed to delete contact: ' + error.message };
    }
  }

  getContactLedger(contactId: number): ApiResponse<LedgerData> {
    try {
      const contact = this.getContactById(contactId);

      if (!contact) {
        return { success: false, message: 'Contact not found' };
      }

      const transactions = this.db.prepare(`
        SELECT 
          t.id,
          t.transaction_no,
          t.date,
          t.type,
          t.description,
          t.reference,
          COALESCE(SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END), 0) as debit,
          COALESCE(SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END), 0) as credit
        FROM transactions t
        LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id AND tl.contact_id = ?
        WHERE t.contact_id = ? AND t.is_void = 0
        GROUP BY t.id
        ORDER BY t.date, t.created_at
      `).all(contactId, contactId);

      // Calculate running balance
      let balance = contact.openingBalance;
      const entries = transactions.map((t: any) => {
        const isCustomer = contact.type === 'customer';
        const debit = isCustomer ? Number(t.debit) : Number(t.credit);
        const credit = isCustomer ? Number(t.credit) : Number(t.debit);

        balance += (debit - credit);

        return {
          id: t.id,
          transactionNo: t.transaction_no,
          date: t.date,
          type: t.type,
          description: t.description,
          reference: t.reference,
          debit,
          credit,
          balance
        };
      });

      return {
        success: true,
        data: {
          contact,
          openingBalance: contact.openingBalance,
          entries,
          currentBalance: balance
        }
      };
    } catch (error: any) {
      console.error('Get ledger error:', error);
      return { success: false, message: 'Failed to get ledger: ' + error.message };
    }
  }

  // ============================================
  // TRANSACTIONS - DOUBLE ENTRY ACCOUNTING
  // ============================================

  createSale(data: SaleData): ApiResponse<any> {
    try {
      // Validate input
      if (!data.items || data.items.length === 0) {
        return { success: false, message: 'No items in sale' };
      }

      // Base validation
      this.automation.preventZeroAmount(data.items.length);

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      let subtotal = 0;
      let totalGst = 0;
      const engineItems: EngineItem[] = [];

      for (const item of data.items) {
        const itemDetails = this.db.prepare('SELECT * FROM items WHERE id = ?').get(item.itemId) as any;
        if (!itemDetails) {
          return { success: false, message: `Item not found: ID ${item.itemId}` };
        }

        const gstRate = item.gstRate !== undefined ? item.gstRate : (itemDetails.gst_rate || 5.0);
        const itemTotal = item.quantity * item.unitPrice;
        const gstAmount = itemDetails.gst_applicable ? (itemTotal * gstRate / 100) : 0;

        subtotal += itemTotal;
        totalGst += gstAmount;

        engineItems.push({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate,
          gstAmount,
          totalAmount: itemTotal + gstAmount,
          isStockApplicable: true,
          name: itemDetails.name
        });
      }

      const discountAmount = data.discountAmount || 0;
      const netAmount = subtotal + totalGst - discountAmount;

      // 1. Get Accounts via Automation mapping
      const mapping = this.automation.mapAccounts('sale', data.paymentMode);

      // 2. Prepare double entry lines
      const lines: EngineTransactionLine[] = [];

      // Debit Cash/Customer
      lines.push({
        accountId: mapping.debitAccount,
        contactId: data.paymentMode === 'credit' ? data.customerId : null,
        description: data.notes || `Sale - ${data.paymentMode}`,
        debitAmount: netAmount,
        creditAmount: 0
      });

      // Credit Sales Revenue
      lines.push({
        accountId: mapping.creditAccount,
        description: 'Sales Revenue',
        debitAmount: 0,
        creditAmount: subtotal
      });

      // Credit GST Output (if applicable)
      if (totalGst > 0) {
        const gstAccountId = this.automation.getGstAccount();
        lines.push({
          accountId: gstAccountId,
          description: 'GST Output',
          debitAmount: 0,
          creditAmount: totalGst,
          gstAmount: totalGst,
          gstType: 'output'
        });
      }

      // Generate COGS entries
      const cogsAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('5000') as any;
      const inventoryAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('1400') as any;

      let totalCogs = 0;
      for (const item of data.items) {
        const itemDetails = this.db.prepare('SELECT average_cost FROM items WHERE id = ?').get(item.itemId) as any;
        totalCogs += (itemDetails.average_cost * item.quantity);
      }

      if (totalCogs > 0) {
        lines.push({
          accountId: cogsAccount.id,
          description: 'Cost of Goods Sold',
          debitAmount: totalCogs,
          creditAmount: 0
        });
        lines.push({
          accountId: inventoryAccount.id,
          description: 'Inventory Value Deduction',
          debitAmount: 0,
          creditAmount: totalCogs
        });
      }

      const event: EngineEvent = {
        type: 'sale',
        date: dateStr,
        contactId: data.customerId,
        description: data.notes || 'Sales Transaction',
        paymentMode: data.paymentMode,
        items: engineItems,
        subtotal,
        gstAmount: totalGst,
        discountAmount,
        netAmount,
        lines,
        createdBy: this.currentUser?.id,
        invoiceDetails: {
          paymentStatus: data.paymentMode === 'credit' ? 'unpaid' : 'paid',
          notes: data.notes
        }
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      const invoice = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.data.invoiceId);
      this.logAudit('CREATE_SALE', 'transactions', result.data.transactionId, { amount: netAmount });

      return {
        success: true,
        data: { invoice },
        message: 'Sale completed successfully'
      };
    } catch (error: any) {
      console.error('Create sale error:', error);
      return { success: false, message: 'Failed to create sale: ' + error.message };
    }
  }

  receiveMoney(data: ReceiveMoneyData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
      const lines: EngineTransactionLine[] = [];
      const mapping = this.automation.mapAccounts('receipt', data.paymentMode);

      // Debit Cash/Bank
      lines.push({
        accountId: mapping.debitAccount,
        description: data.description || 'Money Received',
        debitAmount: data.amount,
        creditAmount: 0
      });

      if (data.contactId) {
        lines.push({
          accountId: mapping.creditAccount,
          contactId: data.contactId,
          description: data.description || 'Payment Received',
          debitAmount: 0,
          creditAmount: data.amount
        });
      } else if (data.accountId) {
        lines.push({
          accountId: data.accountId,
          description: data.description || 'Income',
          debitAmount: 0,
          creditAmount: data.amount
        });
      } else {
        return { success: false, message: 'Either contactId or accountId must be provided' };
      }

      const event: EngineEvent = {
        type: 'receipt',
        date: dateStr,
        contactId: data.contactId,
        description: data.description || 'Money Received',
        reference: data.reference,
        paymentMode: data.paymentMode,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      this.logAudit('RECEIVE_MONEY', 'transactions', result.data.transactionId, { amount: data.amount });
      return { success: true, message: 'Payment received successfully' };
    } catch (error: any) {
      console.error('Receive money error:', error);
      return { success: false, message: 'Failed to receive payment: ' + error.message };
    }
  }

  payMoney(data: PayMoneyData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
      const lines: EngineTransactionLine[] = [];
      const mapping = this.automation.mapAccounts('payment', data.paymentMode);

      // Credit Cash/Bank
      lines.push({
        accountId: mapping.creditAccount,
        description: data.description || 'Money Paid',
        debitAmount: 0,
        creditAmount: data.amount
      });

      if (data.contactId) {
        lines.push({
          accountId: mapping.debitAccount,
          contactId: data.contactId,
          description: data.description || 'Payment Made',
          debitAmount: data.amount,
          creditAmount: 0
        });
      } else if (data.accountId) {
        lines.push({
          accountId: data.accountId,
          description: data.description || 'Expense',
          debitAmount: data.amount,
          creditAmount: 0
        });
      } else {
        return { success: false, message: 'Either contactId or accountId must be provided' };
      }

      const event: EngineEvent = {
        type: 'payment',
        date: dateStr,
        contactId: data.contactId,
        description: data.description || 'Money Paid',
        reference: data.reference,
        paymentMode: data.paymentMode,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      this.logAudit('PAY_MONEY', 'transactions', result.data.transactionId, { amount: data.amount });
      return { success: true, message: 'Payment made successfully' };
    } catch (error: any) {
      console.error('Pay money error:', error);
      return { success: false, message: 'Failed to make payment: ' + error.message };
    }
  }

  transferMoney(data: TransferData): ApiResponse {
    try {
      if (data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero' };
      }

      if (data.fromAccountId === data.toAccountId) {
        return { success: false, message: 'Cannot transfer to the same account' };
      }

      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');
      const lines: EngineTransactionLine[] = [
        {
          accountId: data.toAccountId,
          description: data.description || 'Transfer In',
          debitAmount: data.amount,
          creditAmount: 0
        },
        {
          accountId: data.fromAccountId,
          description: data.description || 'Transfer Out',
          debitAmount: 0,
          creditAmount: data.amount
        }
      ];

      const event: EngineEvent = {
        type: 'transfer',
        date: dateStr,
        description: data.description || 'Fund Transfer',
        reference: data.reference,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: this.currentUser?.id
      };

      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return result;
      }

      this.logAudit('TRANSFER', 'transactions', result.data.transactionId, { amount: data.amount });
      return { success: true, message: 'Transfer completed successfully' };
    } catch (error: any) {
      console.error('Transfer error:', error);
      return { success: false, message: 'Failed to transfer: ' + error.message };
    }
  }

  voidTransaction(id: number, reason: string): ApiResponse {
    try {
      const transaction = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;

      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      if (transaction.is_void) {
        return { success: false, message: 'Transaction is already voided' };
      }

      // Check if period is locked
      const transactionDate = new Date(transaction.date);
      const isLocked = this.db.prepare(`
        SELECT 1 FROM period_locks WHERE year = ? AND month = ? AND is_locked = 1
      `).get(transactionDate.getFullYear(), transactionDate.getMonth() + 1) as any;

      if (isLocked) {
        return { success: false, message: 'Cannot void transaction in a locked period' };
      }

      // Execute void atomically using AutomationService
      this.automation.handleVoid(id, this.currentUser?.id || 1, reason);

      this.logAudit('VOID_TRANSACTION', 'transactions', id, { reason });

      return { success: true, message: 'Transaction voided successfully' };
    } catch (error: any) {
      console.error('Void transaction error:', error);
      return { success: false, message: 'Failed to void transaction: ' + error.message };
    }
  }

  getTransactions(filters?: { type?: string; startDate?: string; endDate?: string; contactId?: number; limit?: number }): Transaction[] {
    try {
      let query = `
        SELECT 
          t.*,
          c.name as contact_name
        FROM transactions t
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.type) {
        query += ' AND t.type = ?';
        params.push(filters.type);
      }

      if (filters?.startDate) {
        query += ' AND t.date >= ?';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ' AND t.date <= ?';
        params.push(filters.endDate);
      }

      if (filters?.contactId) {
        query += ' AND t.contact_id = ?';
        params.push(filters.contactId);
      }

      query += ' ORDER BY t.date DESC, t.created_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const transactions = this.db.prepare(query).all(...params);
      return transactions.map((t: any) => this.mapTransactionFromDb(t));
    } catch (error) {
      console.error('Get transactions error:', error);
      return [];
    }
  }

  getInvoiceByTransactionId(transactionId: number): ApiResponse<any> {
    try {
      const invoice = this.db.prepare(`
        SELECT i.*, c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.gst_number as customer_gst
        FROM invoices i
        LEFT JOIN contacts c ON i.contact_id = c.id
        WHERE i.transaction_id = ?
      `).get(transactionId) as any;

      if (!invoice) {
        return { success: false, message: 'Invoice not found for this transaction' };
      }

      const items = this.db.prepare(`
        SELECT * FROM invoice_items WHERE invoice_id = ?
      `).all(invoice.id) as any[];

      return {
        success: true,
        data: {
          ...invoice,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            gstRate: item.gst_rate,
            gstAmount: item.gst_amount,
            total: item.total_amount
          }))
        }
      };
    } catch (error: any) {
      console.error('Get invoice by transaction error:', error);
      return { success: false, message: 'Failed to get invoice: ' + error.message };
    }
  }

  // ============================================
  // HELPER METHODS
  // Methods below here were kept or refactored

  private generateAccountCode(parentCode: string): string {
    const lastAccount = this.db.prepare(`
      SELECT code FROM accounts 
      WHERE code LIKE ? AND code != ?
      ORDER BY code DESC LIMIT 1
    `).get(`${parentCode}-%`, parentCode) as any;

    let sequence = 1;
    if (lastAccount) {
      const parts = (lastAccount as any).code.split('-');
      sequence = parseInt(parts[1]) + 1;
    }

    return `${parentCode}-${sequence.toString().padStart(3, '0')}`;
  }


  // This method doesn't fit standard double-entry pipelines well if just inserting a single line.
  // We'll update it to create a proper double-entry journal, or just leave it for legacy fallback knowing it imbalances unless a balancing entry exists.
  // Wait, if it's an opening balance, the other side is typically Equity (Retained Earnings/Capital).
  createOpeningBalanceEntry(contactAccountId: number, balance: number, type: 'customer' | 'supplier'): void {
    const equityAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get('3100') as any; // Retained Earnings or a specialized Opening Balance Equity account

    const doOpeningBalance = this.db.transaction(() => {
      const transactionResult = this.db.prepare(`
        INSERT INTO transactions (transaction_no, type, date, description, total_amount, net_amount, status)
        VALUES (?, 'adjustment', date('now'), 'Opening Balance', ?, ?, 'completed')
      `).run(`OB-${Date.now()}`, balance, balance);

      const id = transactionResult.lastInsertRowid as number;

      if (type === 'customer') {
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance', ?, 0)`).run(id, contactAccountId, balance);
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance Offset', 0, ?)`).run(id, equityAccount.id, balance);
      } else {
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance', 0, ?)`).run(id, contactAccountId, balance);
        this.db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount, credit_amount) VALUES (?, ?, 'Opening Balance Offset', ?, 0)`).run(id, equityAccount.id, balance);
      }
      return id;
    });

    doOpeningBalance();
  }



  private logAudit(action: string, entityType: string, entityId: number, data?: any): void {
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        this.currentUser?.id,
        action,
        entityType,
        entityId,
        data ? JSON.stringify(data) : null
      );
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  private mapContactFromDb(row: any): Contact {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email,
      address: row.address,
      creditLimit: row.credit_limit,
      creditDays: row.credit_days,
      openingBalance: row.opening_balance,
      currentBalance: row.current_balance,
      gstNumber: row.gst_number,
      isActive: row.is_active === 1,
      accountId: row.account_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransactionFromDb(row: any): Transaction {
    return {
      id: row.id,
      transactionNo: row.transaction_no,
      type: row.type,
      date: row.date,
      reference: row.reference,
      contactId: row.contact_id,
      contactName: row.contact_name,
      description: row.description,
      totalAmount: row.total_amount,
      gstAmount: row.gst_amount,
      discountAmount: row.discount_amount,
      netAmount: row.net_amount,
      paymentMode: row.payment_mode,
      status: row.status,
      isVoid: row.is_void === 1,
      voidReason: row.void_reason,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      invoiceId: row.invoice_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
