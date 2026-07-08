import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import { format } from 'date-fns';
import type { SplitPayment, ApiResponse } from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine, EngineItem } from './AccountingEngineService';
import { AutomationService } from './AutomationService';

export class SplitPaymentService {
  private db: Database.Database;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  /**
   * Process a sale with multiple payment modes using proper accounting pipeline
   */
  processSaleWithSplit(customerId: number | undefined, items: any[], payments: SplitPayment[], discountAmount = 0, notes?: string): ApiResponse<{ transactionId: number; invoiceNo: string }> {
    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      // Calculate totals
      let subtotal = 0;
      let totalGst = 0;
      let totalCogs = 0;

      const engineItems: EngineItem[] = items.map(item => {
        const gstRate = item.gstRate ?? 5.0;
        const lineTotal = item.quantity * item.unitPrice;
        const lineGst = lineTotal * gstRate / 100;
        subtotal += lineTotal;
        totalGst += lineGst;
        totalCogs += (item.averageCost || 0) * item.quantity;

        return {
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstRate,
          gstAmount: lineGst,
          totalAmount: lineTotal + lineGst,
          name: item.itemName,
          isStockApplicable: true
        };
      });

      const netAmount = subtotal + totalGst - discountAmount;

      // Validate payments sum equals net amount
      const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(paymentTotal - netAmount) > 0.01) {
        return { success: false, message: `Payment total (Nu. ${paymentTotal.toFixed(2)}) does not match invoice total (Nu. ${netAmount.toFixed(2)})` };
      }

      // Build transaction lines
      const lines: EngineTransactionLine[] = [];

      // Debit each payment account
      for (const payment of payments) {
        const accountCode = payment.mode === 'cash' ? '1100' : '1200';
        const account = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(accountCode) as any;
        if (account) {
          lines.push({
            accountId: account.id,
            description: `Payment via ${payment.mode}`,
            debitAmount: payment.amount,
            creditAmount: 0
          });
        }
      }

      // Handle discount
      if (discountAmount > 0) {
        const discountAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '6400'").get() as any;
        if (discountAccount) {
          lines.push({
            accountId: discountAccount.id,
            description: 'Discount Allowed',
            debitAmount: discountAmount,
            creditAmount: 0
          });
        }
      }

      // Credit sales revenue - look up account ID from database by code
      const salesRevenueAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '4000'").get() as any;
      if (salesRevenueAccount) {
        lines.push({
          accountId: salesRevenueAccount.id,
          description: 'Sales Revenue',
          debitAmount: 0,
          creditAmount: subtotal
        });
      }

      // Credit GST Output - look up account ID from database by code
      if (totalGst > 0) {
        const gstOutputAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2200'").get() as any;
        if (gstOutputAccount) {
          lines.push({
            accountId: gstOutputAccount.id,
            description: 'GST Output',
            debitAmount: 0,
            creditAmount: totalGst
          });
        }
      }

      // COGS entries - look up account IDs from database by code
      if (totalCogs > 0) {
        const cogsAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '5000'").get() as any;
        const inventoryAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1400'").get() as any;
        if (cogsAccount) {
          lines.push({
            accountId: cogsAccount.id,
            description: 'Cost of Goods Sold',
            debitAmount: totalCogs,
            creditAmount: 0
          });
        }
        if (inventoryAccount) {
          lines.push({
            accountId: inventoryAccount.id,
            description: 'Inventory Reduction',
            debitAmount: 0,
            creditAmount: totalCogs
          });
        }
      }

      // Determine primary payment mode for transaction
      const primaryMode = payments[0].mode;

      // Create engine event
      const event: EngineEvent = {
        type: 'sale',
        date: dateStr,
        contactId: customerId,
        description: notes || `Split payment sale - ${payments.map(p => p.mode).join(', ')}`,
        paymentMode: primaryMode as any,
        subtotal,
        gstAmount: totalGst,
        discountAmount,
        netAmount,
        lines,
        items: engineItems,
        reference: `SPLIT-${Date.now().toString(36).toUpperCase()}`
      };

      // Execute via Accounting Engine
      const engineResult = this.engine.executePipeline(event);

      if (!engineResult.success) {
        return { success: false, message: engineResult.message || 'Accounting pipeline failed' };
      }

      const transactionId = (engineResult.data as any)?.transactionId;

      // Create invoice with unique number (timestamp + random suffix to prevent collisions)
      const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      this.db.prepare(`
        INSERT INTO invoices (invoice_no, transaction_id, contact_id, subtotal, gst_amount, discount_amount, total_amount, payment_status, balance_due, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', 0, ?)
      `).run(invoiceNo, transactionId, customerId || null, subtotal, totalGst, discountAmount, netAmount, dateStr);

      return { success: true, message: 'Sale with split payment completed', data: { transactionId, invoiceNo } };
    } catch (error: any) {
      console.error('[SplitPaymentService] Error:', error);
      return { success: false, message: 'Failed: ' + error.message };
    }
  }
}
