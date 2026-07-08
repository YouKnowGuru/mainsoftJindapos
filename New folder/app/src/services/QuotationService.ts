import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import { format } from 'date-fns';
import type {
  Quotation,
  QuotationItem,
  CreateQuotationData,
  ApiResponse
} from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine, EngineItem } from './AccountingEngineService';
import { AutomationService } from './AutomationService';
import { InventoryService } from './InventoryService';

export class QuotationService {
  private db: Database.Database;
  private engine: AccountingEngineService;
  private automation: AutomationService;
  private inventory: InventoryService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
    this.inventory = new InventoryService(dbManager);
  }

  generateQuoteNo(): string {
    const last = this.db.prepare("SELECT quote_no FROM quotations ORDER BY id DESC LIMIT 1").get() as any;
    const num = last ? parseInt(last.quote_no.split('-')[1]) + 1 : 1;
    return `QT-${String(num).padStart(5, '0')}`;
  }

  create(data: CreateQuotationData): ApiResponse<{ id: number }> {
    try {
      const quoteNo = this.generateQuoteNo();
      let subtotal = 0;
      let gstAmount = 0;

      const result = this.db.prepare(`
        INSERT INTO quotations (quote_no, customer_id, date, expiry_date, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(quoteNo, data.customerId, data.date, data.expiryDate || null, data.notes || null);

      const quoteId = result.lastInsertRowid as number;

      const insertItem = this.db.prepare(`
        INSERT INTO quotation_items (quote_id, item_id, quantity, unit_price, gst_rate, gst_amount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

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
        gstAmount += lineGst;
        insertItem.run(quoteId, item.itemId, item.quantity, item.unitPrice, gstRate, lineGst, lineTotal + lineGst);
      }

      this.db.prepare(`
        UPDATE quotations SET subtotal = ?, gst_amount = ?, total_amount = ? WHERE id = ?
      `).run(subtotal, gstAmount, subtotal + gstAmount, quoteId);

      return { success: true, message: 'Quotation created', data: { id: quoteId } };
    } catch (error: any) {
      return { success: false, message: 'Failed to create quote: ' + error.message };
    }
  }

  getAll(): ApiResponse<Quotation[]> {
    try {
      const quotes = this.db.prepare(`
        SELECT q.*, c.name as customer_name
        FROM quotations q
        LEFT JOIN contacts c ON q.customer_id = c.id
        ORDER BY q.date DESC
      `).all();

      // Auto-expire old quotes
      const today = format(new Date(), 'yyyy-MM-dd');
      this.db.prepare("UPDATE quotations SET status = 'expired' WHERE expiry_date < ? AND status IN ('draft', 'sent')").run(today);

      const result = (quotes as any[]).map(q => {
        const items = this.db.prepare(`
          SELECT qi.*, i.name as item_name
          FROM quotation_items qi
          JOIN items i ON qi.item_id = i.id
          WHERE qi.quote_id = ?
        `).all(q.id);

        return {
          id: q.id,
          quoteNo: q.quote_no,
          customerId: q.customer_id,
          customerName: q.customer_name,
          date: q.date,
          expiryDate: q.expiry_date,
          status: q.status,
          subtotal: q.subtotal,
          gstAmount: q.gst_amount,
          discountAmount: q.discount_amount,
          totalAmount: q.total_amount,
          notes: q.notes,
          items: (items as any[]).map(i => ({
            id: i.id, quoteId: i.quote_id, itemId: i.item_id, itemName: i.item_name,
            quantity: i.quantity, unitPrice: i.unit_price, gstRate: i.gst_rate,
            gstAmount: i.gst_amount, totalAmount: i.total_amount,
          })),
          createdAt: q.created_at,
        };
      });

      return { success: true, data: result as Quotation[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to get quotes: ' + error.message };
    }
  }

  getById(id: number): ApiResponse<Quotation> {
    try {
      const q = this.db.prepare(`
        SELECT q.*, c.name as customer_name
        FROM quotations q LEFT JOIN contacts c ON q.customer_id = c.id WHERE q.id = ?
      `).get(id) as any;
      if (!q) return { success: false, message: 'Quotation not found' };

      const items = this.db.prepare(`
        SELECT qi.*, i.name as item_name FROM quotation_items qi JOIN items i ON qi.item_id = i.id WHERE qi.quote_id = ?
      `).all(id);

      return {
        success: true,
        data: {
          id: q.id, quoteNo: q.quote_no, customerId: q.customer_id, customerName: q.customer_name,
          date: q.date, expiryDate: q.expiry_date, status: q.status, subtotal: q.subtotal,
          gstAmount: q.gst_amount, discountAmount: q.discount_amount, totalAmount: q.total_amount,
          notes: q.notes, createdAt: q.created_at,
          items: (items as any[]).map(i => ({
            id: i.id, quoteId: i.quote_id, itemId: i.item_id, itemName: i.item_name,
            quantity: i.quantity, unitPrice: i.unit_price, gstRate: i.gst_rate,
            gstAmount: i.gst_amount, totalAmount: i.total_amount,
          })),
        },
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to get quote: ' + error.message };
    }
  }

  /**
   * Convert quotation to a sale transaction with proper accounting entries
   */
  convertToSale(quoteId: number, paymentMode: string): ApiResponse<{ transactionId: number; quoteId: number }> {
    try {
      // 1. Get quotation with items
      const quoteResult = this.getById(quoteId);
      if (!quoteResult.success || !quoteResult.data) {
        return { success: false, message: 'Quotation not found' };
      }

      const quote = quoteResult.data;

      // 2. Validate status - only accepted quotations can be converted
      if (quote.status !== 'accepted') {
        return { success: false, message: 'Only accepted quotations can be converted to sale' };
      }

      // 3. Check if already converted (redundant check removed since we already validated above)

      if (!quote.items || quote.items.length === 0) {
        return { success: false, message: 'Quotation has no items' };
      }

      // 4. Prepare accounting engine event for sale
      const mapping = this.automation.mapAccounts('sale', paymentMode as any);

      // Build transaction lines (double-entry)
      const lines: EngineTransactionLine[] = [];
      let totalRevenue = 0;

      // For each item, create a line
      for (const item of quote.items) {
        const lineTotal = item.totalAmount - item.gstAmount; // Pre-GST amount
        totalRevenue += lineTotal;

        // Credit: Revenue account (4000 - Sales)
        lines.push({
          accountId: mapping.creditAccount,
          description: `Sale: ${item.itemName} (from Quote ${quote.quoteNo})`,
          debitAmount: 0,
          creditAmount: lineTotal
        });
      }

      // Debit: Cash/Bank/Debtors account (based on payment mode)
      // MUST equal total credits (revenue + GST) for balanced entry
      const totalDebit = totalRevenue + quote.gstAmount;
      lines.push({
        accountId: mapping.debitAccount,
        description: `Payment received for Quote ${quote.quoteNo}`,
        debitAmount: totalDebit,
        creditAmount: 0
      });

      // Add GST lines if applicable
      if (quote.gstAmount > 0) {
        // GST Payable (liability)
        const gstAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '2200'").get() as any;
        if (gstAccount) {
          lines.push({
            accountId: gstAccount.id,
            description: `GST on Quote ${quote.quoteNo}`,
            debitAmount: 0,
            creditAmount: quote.gstAmount
          });
        }
      }

      // Prepare items for stock movement
      const engineItems: EngineItem[] = quote.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        gstAmount: item.gstAmount,
        totalAmount: item.totalAmount,
        name: item.itemName || 'Unknown Item',
        isStockApplicable: true
      }));

      const event: EngineEvent = {
        type: 'sale',
        date: format(new Date(), 'yyyy-MM-dd'),
        contactId: quote.customerId,
        description: `Converted from Quotation ${quote.quoteNo}${quote.notes ? ' - ' + quote.notes : ''}`,
        paymentMode: paymentMode as any,
        subtotal: quote.subtotal,
        gstAmount: quote.gstAmount,
        discountAmount: quote.discountAmount || 0,
        netAmount: quote.totalAmount,
        lines,
        items: engineItems,
        reference: quote.quoteNo
      };

      // 5. Execute via Accounting Engine
      const saleResult = this.engine.executePipeline(event);

      if (!saleResult.success) {
        return { success: false, message: `Failed to create sale: ${saleResult.message}` };
      }

      // 6. Update quotation status to converted
      this.db.prepare("UPDATE quotations SET status = 'converted' WHERE id = ?").run(quoteId);

      // 7. Reduce stock for each item
      for (const item of quote.items) {
        try {
          this.inventory.adjustStock(
            item.itemId,
            -item.quantity, // Negative for stock out
            `Sale from Quote ${quote.quoteNo}`,
            `Quotation conversion - ${item.itemName}`
          );
        } catch (stockError: any) {
          console.error(`[QuotationService] Failed to adjust stock for item #${item.itemId}:`, stockError);
          // Don't fail the entire conversion for stock adjustment issues
        }
      }

      const transactionId = (saleResult.data as any)?.transactionId;

      return {
        success: true,
        message: `Quotation converted to sale successfully (Transaction #${transactionId})`,
        data: { transactionId, quoteId }
      };
    } catch (error: any) {
      console.error('[QuotationService] Convert to sale error:', error);
      return { success: false, message: 'Failed to convert: ' + error.message };
    }
  }

  updateStatus(id: number, status: string): ApiResponse {
    try {
      // Validate status value
      const validStatuses = ['draft', 'sent', 'accepted', 'converted', 'expired', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return { success: false, message: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` };
      }

      // Get current status
      const current = this.db.prepare('SELECT status FROM quotations WHERE id = ?').get(id) as any;
      if (!current) {
        return { success: false, message: 'Quotation not found' };
      }

      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        'draft': ['sent', 'cancelled'],
        'sent': ['accepted', 'cancelled', 'expired'],
        'accepted': ['converted', 'cancelled'],
        'converted': [], // Terminal state
        'expired': ['sent', 'cancelled'], // Can resend or cancel
        'cancelled': ['draft'] // Can reactivate
      };

      if (!validTransitions[current.status]?.includes(status)) {
        return { success: false, message: `Invalid status transition from "${current.status}" to "${status}"` };
      }

      this.db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, id);
      return { success: true, message: `Status updated to ${status}` };
    } catch (error: any) {
      return { success: false, message: 'Failed to update status: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM quotation_items WHERE quote_id = ?').run(id);
      this.db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
      return { success: true, message: 'Quotation deleted' };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete quote: ' + error.message };
    }
  }
}
