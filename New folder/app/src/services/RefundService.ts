import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { Refund, CreateRefundData, ApiResponse } from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine } from './AccountingEngineService';
import { AutomationService } from './AutomationService';

export class RefundService {
  private db: Database.Database;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  generateRefundNo(): string {
    const last = this.db.prepare("SELECT refund_no FROM refunds ORDER BY id DESC LIMIT 1").get() as any;
    const num = last ? parseInt(last.refund_no.split('-')[1]) + 1 : 1;
    return `RF-${String(num).padStart(5, '0')}`;
  }

  create(data: CreateRefundData): ApiResponse<{ id: number }> {
    try {
      if (!data.items || data.items.length === 0) {
        return { success: false, message: 'No items in refund' };
      }

      const refundNo = this.generateRefundNo();
      let subtotal = 0;
      let totalGst = 0;

      // 1. Calculate totals
      for (const item of data.items) {
        // Get item details from database to get correct GST rate
        const itemDetails = this.db.prepare('SELECT gst_rate, gst_applicable FROM items WHERE id = ?').get(item.itemId) as any;

        // Use item's GST rate from database, or fallback to provided rate, then to 5.0
        const gstRate = itemDetails?.gst_applicable
          ? (item.gstRate ?? itemDetails?.gst_rate ?? 5.0)
          : 0;

        const lineTotal = item.quantity * item.unitPrice;
        const lineGst = lineTotal * gstRate / 100;
        subtotal += lineTotal;
        totalGst += lineGst;
      }

      const netAmount = subtotal + totalGst;

      // 2. Prepare Accounting Engine Event
      const mapping = this.automation.mapAccounts('refund', data.refundMode || 'cash');
      const lines: EngineTransactionLine[] = [];

      // Debit Sales Revenue (Reducing it)
      lines.push({
        accountId: mapping.debitAccount,
        description: `Refund - ${data.reason || 'Returns'}`,
        debitAmount: subtotal,
        creditAmount: 0
      });

      // Debit GST Output (Reducing it)
      if (totalGst > 0) {
        lines.push({
          accountId: this.automation.getGstAccount(),
          description: 'GST Output Reversal',
          debitAmount: totalGst,
          creditAmount: 0,
          gstAmount: totalGst,
          gstType: 'output'
        });
      }

      // Reversal of COGS (Debit Inventory, Credit COGS)
      let totalCogs = 0;
      for (const item of data.items) {
        const itemDetails = this.db.prepare('SELECT average_cost FROM items WHERE id = ?').get(item.itemId) as any;
        if (itemDetails) {
          totalCogs += (itemDetails.average_cost * item.quantity);
        }
      }

      if (totalCogs > 0) {
        const cogsAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '5000' OR subtype = 'cogs' LIMIT 1").get() as any;
        const inventoryAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1400' OR subtype = 'current_asset' AND name LIKE '%Inventory%' LIMIT 1").get() as any;

        if (cogsAccount && inventoryAccount) {
          // Debit Inventory (Increase stock value)
          lines.push({
            accountId: inventoryAccount.id,
            description: `Inventory Restocked: ${refundNo}`,
            debitAmount: totalCogs,
            creditAmount: 0
          });
          // Credit COGS (Decrease expense)
          lines.push({
            accountId: cogsAccount.id,
            description: `COGS Reversal: ${refundNo}`,
            debitAmount: 0,
            creditAmount: totalCogs
          });
        }
      }

      // Credit Cash/Bank/Customer (Paying them back)
      lines.push({
        accountId: mapping.creditAccount,
        contactId: data.refundMode === 'credit' ? data.customerId : null,
        description: `Refund Payout: ${refundNo}`,
        debitAmount: 0,
        creditAmount: netAmount
      });

      // Look up the original transaction to get its taxType for consistent GST reporting
      const originalTx = this.db.prepare('SELECT tax_type FROM transactions WHERE id = ?').get(data.originalTransactionId) as any;
      const originalTaxType = originalTx?.tax_type || 'standard';

      const event: EngineEvent = {
        type: 'adjustment', // DB CHECK: must be one of sale|purchase|receipt|payment|transfer|adjustment|journal
        date: data.date,
        contactId: data.customerId,
        description: data.reason || `Refund for TXN #${data.originalTransactionId}`,
        paymentMode: data.refundMode as any,
        items: data.items.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gstRate: i.gstRate || 0,
          gstAmount: (i.quantity * i.unitPrice * (i.gstRate || 0) / 100),
          totalAmount: i.quantity * i.unitPrice * (1 + (i.gstRate || 0) / 100),
          isStockApplicable: true,
          name: 'Refunded Item'
        })),
        subtotal,
        gstAmount: totalGst,
        discountAmount: 0,
        netAmount,
        lines,
        taxType: originalTaxType
      };

      // 3. Execute in Atomic Transaction
      const result = this.engine.executePipeline(event);

      if (!result.success) {
        return { success: false, message: 'Accounting Engine Failed: ' + result.message };
      }

      const transactionId = result.data.transactionId;

      const refundResult = this.db.prepare(`
        INSERT INTO refunds (refund_no, original_transaction_id, customer_id, transaction_id, date, reason, refund_mode, subtotal, gst_amount, total_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        refundNo,
        data.originalTransactionId,
        data.customerId || null,
        transactionId,
        data.date,
        data.reason,
        data.refundMode,
        subtotal,
        totalGst,
        netAmount,
        data.notes || null
      );

      const refundId = refundResult.lastInsertRowid as number;

      const insertItem = this.db.prepare(`
        INSERT INTO refund_items (refund_id, item_id, quantity, unit_price, gst_rate, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        const gstRate = item.gstRate ?? 5.0;
        const total = item.quantity * item.unitPrice * (1 + gstRate / 100);
        insertItem.run(refundId, item.itemId, item.quantity, item.unitPrice, gstRate, total);
      }

      return { success: true, message: 'Refund completed successfully', data: { id: refundId } };
    } catch (error: any) {
      console.error('Refund creation error:', error);
      return { success: false, message: 'Failed to process refund: ' + error.message };
    }
  }

  getAll(): ApiResponse<Refund[]> {
    try {
      const refunds = this.db.prepare(`
        SELECT r.*, c.name as customer_name
        FROM refunds r
        LEFT JOIN contacts c ON r.customer_id = c.id
        ORDER BY r.date DESC
      `).all();

      const result = (refunds as any[]).map(r => {
        const items = this.db.prepare(`
          SELECT ri.*, i.name as item_name FROM refund_items ri JOIN items i ON ri.item_id = i.id WHERE ri.refund_id = ?
        `).all(r.id);

        return {
          id: r.id, refundNo: r.refund_no, originalTransactionId: r.original_transaction_id,
          customerId: r.customer_id, customerName: r.customer_name, date: r.date,
          reason: r.reason, refundMode: r.refund_mode, subtotal: r.subtotal,
          gstAmount: r.gst_amount, totalAmount: r.total_amount, status: r.status,
          notes: r.notes, createdAt: r.created_at,
          items: (items as any[]).map(i => ({
            itemId: i.item_id, itemName: i.item_name, quantity: i.quantity,
            unitPrice: i.unit_price, gstRate: i.gst_rate, totalAmount: i.total_amount,
          })),
        };
      });

      return { success: true, data: result as Refund[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to get refunds: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM refund_items WHERE refund_id = ?').run(id);
      this.db.prepare('DELETE FROM refunds WHERE id = ?').run(id);
      return { success: true, message: 'Refund deleted' };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete refund: ' + error.message };
    }
  }
}
