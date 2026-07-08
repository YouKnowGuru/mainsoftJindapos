import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { RecurringTransaction, CreateRecurringData, ApiResponse } from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine } from './AccountingEngineService';
import { AutomationService } from './AutomationService';

export class RecurringService {
  private db: Database.Database;
  private dbManager: DatabaseManager;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  create(data: CreateRecurringData): ApiResponse<{ id: number }> {
    try {
      if (!data.nextDueDate) {
        return { success: false, message: 'Next due date is required' };
      }

      if (!data.type || !['payment', 'receipt'].includes(data.type)) {
        return { success: false, message: 'Type must be either "payment" or "receipt"' };
      }

      if (!data.amount || data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than 0' };
      }

      if (!data.accountId) {
        return { success: false, message: 'Account is required' };
      }

      // Validate account exists and is proper type
      const account = this.db.prepare('SELECT id, type, subtype FROM accounts WHERE id = ?').get(data.accountId) as any;
      if (!account) {
        return { success: false, message: 'Account not found' };
      }

      // Validate that expense accounts are used for payments and income for receipts
      if (data.type === 'payment' && account.type !== 'expense') {
        return { success: false, message: 'Please select an expense account for recurring payments' };
      }

      if (data.type === 'receipt' && account.type !== 'income') {
        return { success: false, message: 'Please select an income account for recurring receipts' };
      }

      const result = this.db.prepare(`
        INSERT INTO recurring_transactions (name, type, amount, frequency, next_due_date, account_id, contact_id, payment_mode, description, end_date, max_occurrences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.type,
        data.amount,
        data.frequency,
        data.nextDueDate,
        data.accountId,
        data.contactId || null,
        (data as any).paymentMode || 'cash',
        data.description || null,
        (data as any).endDate || null,
        (data as any).maxOccurrences || null
      );

      return { success: true, message: 'Recurring transaction created', data: { id: result.lastInsertRowid as number } };
    } catch (error: any) {
      console.error('Failed to create recurring:', error);
      return { success: false, message: 'Failed to create: ' + error.message };
    }
  }

  getAll(activeOnly = true): ApiResponse<RecurringTransaction[]> {
    try {
      let query = `
        SELECT rt.*, a.name as account_name, c.name as contact_name
        FROM recurring_transactions rt
        LEFT JOIN accounts a ON rt.account_id = a.id
        LEFT JOIN contacts c ON rt.contact_id = c.id
      `;
      if (activeOnly) query += ' WHERE rt.is_active = 1';
      query += ' ORDER BY rt.next_due_date ASC';

      const items = this.db.prepare(query).all();
      return { success: true, data: items as RecurringTransaction[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to get recurring: ' + error.message };
    }
  }

  processDueToday(): ApiResponse<number> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all active recurring transactions due today or earlier
      // Exclude those that have reached max_occurrences or passed end_date
      const due = this.db.prepare(`
        SELECT * FROM recurring_transactions 
        WHERE next_due_date <= ? 
          AND is_active = 1
          AND (end_date IS NULL OR next_due_date <= end_date)
          AND (max_occurrences IS NULL OR occurrence_count < max_occurrences)
        ORDER BY next_due_date ASC
      `).all(today) as any[];

      if (due.length === 0) {
        return { success: true, message: 'No transactions due today', data: 0 };
      }

      let processed = 0;
      const errors: string[] = [];

      // Use safeTransaction to wrap the entire batch
      this.dbManager.safeTransaction(() => {
        for (const rt of due) {
          try {
            // Check if already processed today (prevent duplicate processing)
            const alreadyProcessed = this.db.prepare(`
              SELECT COUNT(*) as count FROM recurring_execution_log 
              WHERE recurring_transaction_id = ? 
                AND execution_date = ? 
                AND status = 'success'
            `).get(rt.id, today) as any;

            if (alreadyProcessed.count > 0) {
              console.log(`[Recurring] Skipping #${rt.id} - already processed today`);
              continue;
            }

            // Calculate next date using date-fns for proper month-end handling
            const calcNextDate = (currentDateStr: string, freq: string): string => {
              const d = new Date(currentDateStr);
              switch (freq) {
                case 'daily': d.setDate(d.getDate() + 1); break;
                case 'weekly': d.setDate(d.getDate() + 7); break;
                case 'monthly': {
                  // Handle month-end edge cases (Jan 31 -> Feb 28)
                  const nextMonth = new Date(d);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  // If day changed (e.g., 31 -> 3), use last day of previous month
                  if (nextMonth.getDate() !== d.getDate()) {
                    nextMonth.setDate(0); // Last day of previous month
                  }
                  return nextMonth.toISOString().split('T')[0];
                }
                case 'quarterly': {
                  const nextQuarter = new Date(d);
                  nextQuarter.setMonth(nextQuarter.getMonth() + 3);
                  if (nextQuarter.getDate() !== d.getDate()) {
                    nextQuarter.setDate(0);
                  }
                  return nextQuarter.toISOString().split('T')[0];
                }
                case 'yearly': {
                  const nextYear = new Date(d);
                  nextYear.setFullYear(nextYear.getFullYear() + 1);
                  if (nextYear.getDate() !== d.getDate()) {
                    // Feb 29 on non-leap year → go to Feb 28 (same month, last day)
                    nextYear.setDate(0);
                  }
                  return nextYear.toISOString().split('T')[0];
                }
                default: return d.toISOString().split('T')[0];
              }
              return d.toISOString().split('T')[0];
            };

            // 1. Prepare Accounting Engine Event
            const type = rt.type as 'payment' | 'receipt';
            const mode = rt.payment_mode || 'cash';

            // Use mapping to find the Cash/Bank account
            const mapping = this.automation.mapAccounts(type, mode);
            const lines: EngineTransactionLine[] = [];

            if (type === 'payment') {
              // Expense: Debit the Category, Credit the Money Source
              lines.push({
                accountId: rt.account_id,
                description: `Automated Expense: ${rt.name}`,
                debitAmount: rt.amount,
                creditAmount: 0
              });
              lines.push({
                accountId: mapping.creditAccount, // The Money Source (Cash/Bank)
                contactId: rt.contact_id,
                description: `Auto PMT: ${rt.name}`,
                debitAmount: 0,
                creditAmount: rt.amount
              });
            } else {
              // Income: Debit the Money Source, Credit the Category
              lines.push({
                accountId: mapping.debitAccount, // The Money Source (Cash/Bank)
                contactId: rt.contact_id,
                description: `Auto RCT: ${rt.name}`,
                debitAmount: rt.amount,
                creditAmount: 0
              });
              lines.push({
                accountId: rt.account_id,
                description: `Automated Income: ${rt.name}`,
                debitAmount: 0,
                creditAmount: rt.amount
              });
            }

            const event: EngineEvent = {
              type: type as any,
              date: today,
              contactId: rt.contact_id,
              description: `Automatically generated: ${rt.name}${rt.description ? ' - ' + rt.description : ''}`,
              paymentMode: mode,
              subtotal: rt.amount,
              gstAmount: 0,
              discountAmount: 0,
              netAmount: rt.amount,
              lines
            };

            // 2. Execute via Accounting Engine (RT prefix for Recurring)
            const result = this.engine.executePipeline(event);

            if (result.success) {
              const transactionId = (result.data as any)?.transactionId;

              // 3. Update next due date and increment occurrence count
              const nextDate = calcNextDate(rt.next_due_date, rt.frequency);
              this.db.prepare(`
                UPDATE recurring_transactions 
                SET next_due_date = ?, occurrence_count = occurrence_count + 1 
                WHERE id = ?
              `).run(nextDate, rt.id);

              // 4. Log successful execution
              this.db.prepare(`
                INSERT INTO recurring_execution_log 
                (recurring_transaction_id, generated_transaction_id, execution_date, status)
                VALUES (?, ?, ?, 'success')
              `).run(rt.id, transactionId || null, today);

              processed++;
              console.log(`[Recurring] Successfully processed #${rt.id} (${rt.name})`);
            } else {
              // Log failed execution
              this.db.prepare(`
                INSERT INTO recurring_execution_log 
                (recurring_transaction_id, execution_date, status, error_message)
                VALUES (?, ?, 'failed', ?)
              `).run(rt.id, today, result.message);

              errors.push(`#${rt.id}: ${result.message}`);
              console.error(`[Recurring] Failed to process #${rt.id}: ${result.message}`);
            }
          } catch (itemError: any) {
            // Log individual item error and continue with others
            this.db.prepare(`
              INSERT INTO recurring_execution_log 
              (recurring_transaction_id, execution_date, status, error_message)
              VALUES (?, ?, 'failed', ?)
            `).run(rt.id, today, itemError.message);

            errors.push(`#${rt.id}: ${itemError.message}`);
            console.error(`[Recurring] Error processing #${rt.id}:`, itemError);
          }
        }
      });

      // Build result message
      let message = `${processed} transaction(s) processed successfully`;
      if (errors.length > 0) {
        message += `. ${errors.length} failed: ${errors.join(', ')}`;
      }

      return {
        success: errors.length === 0,
        message,
        data: processed
      };
    } catch (error: any) {
      console.error('[Recurring] Batch processing error:', error);
      return { success: false, message: 'Failed to process recurring: ' + error.message };
    }
  }

  toggleActive(id: number): ApiResponse {
    try {
      const current = this.db.prepare('SELECT is_active FROM recurring_transactions WHERE id = ?').get(id) as any;
      if (!current) return { success: false, message: 'Not found' };
      this.db.prepare('UPDATE recurring_transactions SET is_active = ? WHERE id = ?').run(current.is_active ? 0 : 1, id);
      return { success: true, message: 'Status toggled' };
    } catch (error: any) {
      return { success: false, message: 'Failed to toggle: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id);
      return { success: true, message: 'Deleted' };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete: ' + error.message };
    }
  }
}
