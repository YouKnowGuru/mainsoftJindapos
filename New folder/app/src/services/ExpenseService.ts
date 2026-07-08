import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { Expense, CreateExpenseData, ApiResponse } from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine } from './AccountingEngineService';
import { AutomationService } from './AutomationService';
import { format } from 'date-fns';

export class ExpenseService {
  private db: Database.Database;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  generateExpenseNo(): string {
    const last = this.db.prepare("SELECT expense_no FROM expenses ORDER BY id DESC LIMIT 1").get() as any;
    const num = last ? parseInt(last.expense_no.split('-')[1]) + 1 : 1;
    return `EX-${String(num).padStart(5, '0')}`;
  }

  create(data: CreateExpenseData, userId: number = 1): ApiResponse<{ id: number; transactionId: number }> {
    try {
      const expenseNo = this.generateExpenseNo();
      const dateStr = data.date || format(new Date(), 'yyyy-MM-dd');

      const paymentMode = data.paymentMode || 'cash';
      const mapping = this.automation.mapAccounts('payment', paymentMode as any);

      // 1. Prepare Accounting Lines
      const lines: EngineTransactionLine[] = [
        // Credit the Payment Source (Cash/Bank)
        {
          accountId: mapping.creditAccount,
          description: data.description || `Expense: ${data.category}`,
          debitAmount: 0,
          creditAmount: data.amount
        },
        // Debit the Expense Category
        {
          accountId: data.accountId,
          description: data.description || `Expense: ${data.category}`,
          debitAmount: data.amount,
          creditAmount: 0
        }
      ];

      const event: EngineEvent = {
        type: 'payment',
        date: dateStr,
        description: data.description || `Business Expense - ${data.category}`,
        reference: expenseNo,
        paymentMode: paymentMode as any,
        subtotal: data.amount,
        gstAmount: 0,
        discountAmount: 0,
        netAmount: data.amount,
        lines,
        createdBy: userId
      };

      // 2. Execute via Accounting Engine
      const engineResult = this.engine.executePipeline(event);
      if (!engineResult.success) {
        return { success: false, message: engineResult.message || 'Accounting pipeline failed' };
      }

      const transactionId = engineResult.data.transactionId;

      // 3. Save to Expenses Table
      const result = this.db.prepare(`
        INSERT INTO expenses (
          expense_no, date, category, amount, payment_mode, 
          vendor, description, transaction_id, account_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseNo, dateStr, data.category, data.amount, paymentMode,
        data.vendor || null, data.description || null, transactionId, data.accountId
      );

      return {
        success: true,
        message: 'Expense recorded in ledger',
        data: { id: result.lastInsertRowid as number, transactionId }
      };
    } catch (error: any) {
      console.error('Expense create error:', error);
      return { success: false, message: 'Failed to record expense: ' + error.message };
    }
  }

  getAll(filters?: { startDate?: string; endDate?: string; category?: string }): ApiResponse<Expense[]> {
    try {
      // First, get expenses from the expenses table (created via Expense Tracker)
      let query = `
        SELECT e.*, a.name as account_name
        FROM expenses e
        LEFT JOIN accounts a ON e.account_id = a.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.startDate) { query += ' AND e.date >= ?'; params.push(filters.startDate); }
      if (filters?.endDate) { query += ' AND e.date <= ?'; params.push(filters.endDate); }
      if (filters?.category) { query += ' AND e.category = ?'; params.push(filters.category); }

      query += ' ORDER BY e.date DESC, e.created_at DESC';

      const expenses = this.db.prepare(query).all(...params) as any[];

      // Also include payment transactions that aren't linked to expenses table
      // This captures payroll and other payment transactions created via Transactions page
      const startDate = filters?.startDate || '1900-01-01';
      const endDate = filters?.endDate || '9999-12-31';

      const orphanPayments = this.db.prepare(`
        SELECT
          t.id,
          t.transaction_no as expense_no,
          t.date,
          a.name as category,
          t.net_amount as amount,
          t.payment_mode,
          t.description,
          t.reference as vendor,
          'Payment Transaction' as account_name,
          t.id as transaction_id
        FROM transactions t
        LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
        LEFT JOIN accounts a ON tl.account_id = a.id
        LEFT JOIN expenses e ON t.id = e.transaction_id
        WHERE t.type = 'payment'
          AND t.is_void = 0
          AND e.id IS NULL
          AND a.subtype = 'operating_expense'
          AND t.date >= ? AND t.date <= ?
        ORDER BY t.date DESC, t.created_at DESC
      `).all(startDate, endDate) as any[];

      // Combine both sources
      const combined = [...expenses, ...orphanPayments];
      return { success: true, data: combined as Expense[] };
    } catch (error: any) {
      console.error('[ExpenseService] Error in getAll:', error);
      return { success: false, message: 'Failed to get expenses: ' + error.message };
    }
  }

  getSummary(month: number, year: number): ApiResponse<any> {
    try {
      const byCategory = this.db.prepare(`
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
        GROUP BY category ORDER BY total DESC
      `).all(String(month).padStart(2, '0'), String(year));

      const total = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM expenses
        WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(String(month).padStart(2, '0'), String(year)) as any;

      return { success: true, data: { byCategory, total: total.total, month, year } };
    } catch (error: any) {
      return { success: false, message: 'Failed to get summary: ' + error.message };
    }
  }

  delete(id: number, userId: number = 1): ApiResponse {
    try {
      const expense = this.db.prepare('SELECT transaction_id FROM expenses WHERE id = ?').get(id) as any;

      if (expense && expense.transaction_id) {
        // Void the formal transaction
        this.automation.handleVoid(expense.transaction_id, userId, 'Expense deleted from tracker');
      }

      this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      return { success: true, message: 'Expense deleted and transaction voided' };
    } catch (error: any) {
      console.error('Expense delete error:', error);
      return { success: false, message: 'Failed to delete expense: ' + error.message };
    }
  }
}
