import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import { isAfter, parseISO } from 'date-fns';
import type { PaymentMode, TransactionType } from '../types';

export interface EngineTransactionLine {
  accountId: number;
  contactId?: number | null;
  itemId?: number | null;
  description: string;
  debitAmount: number;
  creditAmount: number;
  gstAmount?: number;
  gstType?: 'input' | 'output';
}

export interface EngineItem {
  itemId: number;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  isStockApplicable: boolean;
  name: string;
}

export interface EngineEvent {
  type: TransactionType;
  date: string; // YYYY-MM-DD
  contactId?: number | null;
  description: string;
  reference?: string | null;
  paymentMode?: PaymentMode;
  items?: EngineItem[];
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  netAmount: number;
  lines: EngineTransactionLine[];
  createdBy?: number;
  invoiceDetails?: {
    dueDate?: string | null;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    notes?: string | null;
    terms?: string | null;
  };
}

/**
 * AccountingEngineService
 * Enforces strict double-entry and pipeline execution rules.
 */
export class AccountingEngineService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  /**
   * Pipeline Executor
   * Executes the strict transaction pipeline sequence safely within a DB transaction.
   * Rollbacks if any step fails.
   */
  public executePipeline(event: EngineEvent): { success: boolean; data?: any; message?: string } {
    try {
      // Step 1: Validate input basic structure
      this.validateInput(event);

      // Step 2: Check date validity
      this.checkDateValidity(event.date);

      // Step 3: Check period lock
      this.checkPeriodLock(event.date);

      // Step 4: Check stock availability (if sale)
      if (event.type === 'sale' && event.items) {
        this.checkStockAvailability(event.items);
      }

      // Step 5: Check credit limit (if credit sale)
      if (event.type === 'sale' && event.paymentMode === 'credit' && event.contactId) {
        this.checkCreditLimit(event.contactId, event.netAmount);
      }

      // Step 6: Validate balance (Debits === Credits)
      this.validateBalance(event.lines);

      // Steps 7-13: Execute DB operations within a transaction
      const executeInTransaction = this.db.transaction(() => {
        // Step 7: Generate / Save transaction object
        const transactionNo = this.generateTransactionNo(event.type);
        const transactionResult = this.db.prepare(`
          INSERT INTO transactions 
          (transaction_no, type, date, contact_id, description, total_amount, gst_amount, discount_amount, net_amount, payment_mode, reference, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          transactionNo,
          event.type,
          event.date,
          event.contactId || null,
          event.description,
          event.subtotal,
          event.gstAmount,
          event.discountAmount,
          event.netAmount,
          event.paymentMode || null,
          event.reference || null,
          event.createdBy || null
        );

        const transactionId = transactionResult.lastInsertRowid as number;

        // Step 8 & 9: Generate debit and credit entries
        this.saveTransactionLines(transactionId, event.lines);

        // Save GST entries if any
        this.saveGstEntries(transactionId, event.lines, event.date);

        // Step 10: Update stock movements
        if (event.items && ['sale', 'purchase'].includes(event.type)) {
          this.saveStockMovements(transactionId, event.items, event.type === 'sale' ? 'out' : 'in');
        }

        // Step 11: Generate invoice (if sale)
        let invoiceId = null;
        if (event.type === 'sale' && event.invoiceDetails) {
          invoiceId = this.generateInvoice(transactionId, transactionNo, event);
          // Update transaction with invoice ID
          this.db.prepare('UPDATE transactions SET invoice_id = ? WHERE id = ?').run(invoiceId, transactionId);
        }

        // Step 12: Update contact balance if applicable
        if (event.contactId) {
          this.updateContactBalance(event.contactId);
        }

        // Return core transaction info
        return { transactionId, transactionNo, invoiceId };
      });

      const result = executeInTransaction();

      return {
        success: true,
        data: result,
        message: `${event.type} transaction completed successfully`,
      };
    } catch (error: any) {
      console.error('Pipeline execution error:', error);
      return {
        success: false,
        message: error.message || 'Transaction failed',
      };
    }
  }

  // ==========================================
  // PIPELINE VALIDATION STEPS
  // ==========================================

  private validateInput(event: EngineEvent) {
    if (!event.type || !event.date || event.netAmount === undefined || !event.lines) {
      throw new Error('Invalid event payload: Missing required fields.');
    }
    if (event.lines.length < 2) {
      throw new Error('Double Entry Rule: Transaction must contain at least 2 transaction_lines.');
    }
  }

  private checkDateValidity(dateStr: string) {
    const txDate = parseISO(dateStr);
    const today = new Date();
    // Allow saving today or past, but not future dates strictly
    today.setHours(23, 59, 59, 999);
    if (isAfter(txDate, today)) {
      throw new Error('Transaction date cannot be in the future.');
    }
  }

  private checkPeriodLock(dateStr: string) {
    const txDate = parseISO(dateStr);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;

    const isLocked = this.db.prepare(`
      SELECT 1 FROM period_locks WHERE year = ? AND month = ? AND is_locked = 1
    `).get(year, month);

    if (isLocked) {
      throw new Error('Period Lock: Cannot create transaction in a locked period.');
    }
  }

  private checkStockAvailability(items: EngineItem[]) {
    for (const item of items) {
      if (!item.isStockApplicable) continue;

      const stockItem = this.db.prepare('SELECT quantity_in_stock, name FROM items WHERE id = ?').get(item.itemId) as any;
      if (!stockItem) {
        throw new Error(`Item not found: ID ${item.itemId}`);
      }
      if (stockItem.quantity_in_stock < item.quantity) {
        throw new Error(`Stock Consistency Rule: Insufficient stock for ${item.name}. Available: ${stockItem.quantity_in_stock}`);
      }
    }
  }

  private checkCreditLimit(customerId: number, additionalAmount: number) {
    const contact = this.db.prepare('SELECT credit_limit FROM contacts WHERE id = ?').get(customerId) as any;
    if (!contact) {
      throw new Error('Customer not found for credit check.');
    }

    // Calculate current outstanding dynamically from transaction_lines
    const outstanding = this.calculateOutstanding(customerId);

    if (outstanding + additionalAmount > contact.credit_limit) {
      throw new Error(`Credit Control Rule: Credit limit exceeded. Outstanding: ${outstanding}, Limit: ${contact.credit_limit}, New Sale: ${additionalAmount}`);
    }
  }

  private validateBalance(lines: EngineTransactionLine[]) {
    // We round to 2 decimals to prevent floating point inaccuracies
    const totalDebit = Number(lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0).toFixed(2));
    const totalCredit = Number(lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0).toFixed(2));

    if (totalDebit !== totalCredit) {
      throw new Error(`Double Entry Rule: Transaction not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }
  }

  // ==========================================
  // PIPELINE DB OPERATIONS (Inside Transaction)
  // ==========================================

  private saveTransactionLines(transactionId: number, lines: EngineTransactionLine[]) {
    const insertLine = this.db.prepare(`
      INSERT INTO transaction_lines (transaction_id, account_id, contact_id, item_id, description, debit_amount, credit_amount, gst_amount, gst_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of lines) {
      insertLine.run(
        transactionId,
        line.accountId,
        line.contactId || null,
        line.itemId || null,
        line.description,
        line.debitAmount,
        line.creditAmount,
        line.gstAmount || 0,
        line.gstType || null
      );
    }
  }

  private saveGstEntries(transactionId: number, lines: EngineTransactionLine[], dateStr: string) {
    const txDate = new Date(dateStr);
    const month = txDate.getMonth() + 1;
    const year = txDate.getFullYear();

    const insertGst = this.db.prepare(`
      INSERT INTO gst_entries (transaction_id, type, amount, month, year)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Sum up input vs output gst
    let totalInput = 0;
    let totalOutput = 0;

    for (const line of lines) {
      if (line.gstType === 'input' && line.gstAmount) totalInput += line.gstAmount;
      if (line.gstType === 'output' && line.gstAmount) totalOutput += line.gstAmount;
    }

    if (totalInput > 0) insertGst.run(transactionId, 'input', totalInput, month, year);
    if (totalOutput > 0) insertGst.run(transactionId, 'output', totalOutput, month, year);
  }

  private saveStockMovements(transactionId: number, items: EngineItem[], type: 'in' | 'out') {
    const insertMovement = this.db.prepare(`
      INSERT INTO stock_movements (item_id, transaction_id, type, quantity, unit_cost, total_cost, reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateItemStock = this.db.prepare(`
      UPDATE items SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?
    `);

    for (const item of items) {
      if (!item.isStockApplicable) continue;

      insertMovement.run(
        item.itemId,
        transactionId,
        type,
        item.quantity,
        item.unitPrice,
        item.totalAmount,
        `Tx ${transactionId}`
      );

      // Stock Rule 4: Update stock quantity
      const stockChange = type === 'in' ? item.quantity : -item.quantity;
      updateItemStock.run(stockChange, item.itemId);
    }
  }

  private generateInvoice(transactionId: number, transactionNo: string, event: EngineEvent): number {
    const invoiceNo = `INV-${transactionNo.split('-')[1] || Date.now()}`;
    const details = event.invoiceDetails!;

    const result = this.db.prepare(`
      INSERT INTO invoices 
      (invoice_no, transaction_id, contact_id, date, due_date, subtotal, gst_amount, discount_amount, total_amount, balance_due, payment_status, notes, terms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNo,
      transactionId,
      event.contactId || null,
      event.date,
      details.dueDate || null,
      event.subtotal,
      event.gstAmount,
      event.discountAmount,
      event.netAmount,
      event.paymentMode === 'credit' ? event.netAmount : 0,
      details.paymentStatus,
      details.notes || null,
      details.terms || null
    );

    const invoiceId = result.lastInsertRowid as number;

    const insertInvoiceItem = this.db.prepare(`
      INSERT INTO invoice_items 
      (invoice_id, item_id, description, quantity, unit_price, gst_rate, gst_amount, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (event.items) {
      for (const item of event.items) {
        insertInvoiceItem.run(
          invoiceId,
          item.itemId,
          item.name,
          item.quantity,
          item.unitPrice,
          item.gstRate,
          item.gstAmount,
          item.totalAmount
        );
      }
    }

    return invoiceId;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private generateTransactionNo(type: string): string {
    const prefixMap: Record<string, string> = {
      'sale': 'SAL',
      'purchase': 'PUR',
      'receipt': 'RCP',
      'payment': 'PAY',
      'transfer': 'TRF',
      'adjustment': 'ADJ',
      'journal': 'JNL'
    };

    // Fallback if not mapped
    const prefix = prefixMap[type.toLowerCase()] || 'TXN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}${random}`;
  }

  private calculateOutstanding(contactId: number): number {
    // Outstanding = normalized balance for contact.
    // Logic: Match by tl.contact_id OR tl.account_id OR the parent transaction's contact_id
    // This ensures we catch historical entries that might be missing specific links.
    const contact = this.db.prepare('SELECT account_id, type, opening_balance FROM contacts WHERE id = ?').get(contactId) as any;
    if (!contact) return 0;

    const result = this.db.prepare(`
      SELECT 
        COALESCE(SUM(tl.debit_amount), 0) as total_debit, 
        COALESCE(SUM(tl.credit_amount), 0) as total_credit 
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE t.is_void = 0 
      AND (
        tl.contact_id = ? 
        OR tl.account_id = ?
        OR (t.contact_id = ? AND tl.account_id IN (SELECT id FROM accounts WHERE code IN ('1300', '2100')))
      )
    `).get(contactId, contact.account_id, contactId) as any;

    const debit = Number(result.total_debit);
    const credit = Number(result.total_credit);

    if (contact.type === 'customer') {
      return contact.opening_balance + (debit - credit);
    } else {
      return contact.opening_balance + (credit - debit);
    }
  }

  private updateContactBalance(contactId: number) {
    const balance = this.calculateOutstanding(contactId);
    this.db.prepare(`
      UPDATE contacts 
      SET current_balance = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(balance, contactId);
  }
}
