import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import { format } from 'date-fns';

// Round to 2 decimal places for financial calculations
const round2 = (n: number): number => Math.round(n * 100) / 100;
import type {
  PurchaseOrder,
  CreatePurchaseOrderData,
  ApiResponse
} from '../types';
import { AccountingEngineService } from './AccountingEngineService';
import type { EngineEvent, EngineTransactionLine } from './AccountingEngineService';
import { AutomationService } from './AutomationService';

export class PurchaseOrderService {
  private db: Database.Database;
  private engine: AccountingEngineService;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.engine = new AccountingEngineService(dbManager);
    this.automation = new AutomationService(dbManager);
  }

  generatePONo(): string {
    const last = this.db.prepare("SELECT po_no FROM purchase_orders ORDER BY id DESC LIMIT 1").get() as any;
    const num = last ? parseInt(last.po_no.split('-')[1]) + 1 : 1;
    return `PO-${String(num).padStart(5, '0')}`;
  }

  create(data: CreatePurchaseOrderData): ApiResponse<{ id: number }> {
    try {
      // Validate items before any DB writes
      if (!data.supplierId || data.items.length === 0) {
        return { success: false, message: 'Supplier and at least one item are required' };
      }
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item.itemId || item.itemId <= 0) {
          return { success: false, message: `Item in row ${i + 1} is not selected` };
        }
        if (!item.quantity || item.quantity <= 0) {
          return { success: false, message: `Row ${i + 1}: Quantity must be greater than 0` };
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          return { success: false, message: `Row ${i + 1}: Purchase price must be greater than 0` };
        }
      }

      const poNo = this.generatePONo();
      let subtotal = 0;
      let gstAmount = 0;

      const result = this.db.prepare(`
        INSERT INTO purchase_orders (po_no, supplier_id, date, expected_date, notes, tax_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(poNo, data.supplierId, data.date, data.expectedDate || null, data.notes || null, data.taxType || 'standard');

      const poId = result.lastInsertRowid as number;

      const insertItem = this.db.prepare(`
        INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, gst_rate, gst_amount, total_amount, selling_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        // Get item details from database to get correct GST rate
        const itemDetails = this.db.prepare('SELECT gst_rate, gst_applicable FROM items WHERE id = ?').get(item.itemId) as any;

        // Use item's GST rate from database, or fallback to provided rate, then to 5.0
        const gstRate = itemDetails?.gst_applicable
          ? (item.gstRate ?? itemDetails?.gst_rate ?? 5.0)
          : 0;

        const lineTotal = round2(item.quantity * item.unitPrice);
        const lineGst = round2(lineTotal * gstRate / 100);
        const lineTotalWithGst = round2(lineTotal + lineGst);
        subtotal = round2(subtotal + lineTotal);
        gstAmount = round2(gstAmount + lineGst);

        insertItem.run(poId, item.itemId, item.quantity, item.unitPrice, gstRate, lineGst, lineTotalWithGst, item.sellingPrice || 0);
      }

      this.db.prepare(`
        UPDATE purchase_orders SET subtotal = ?, gst_amount = ?, total_amount = ?
        WHERE id = ?
      `).run(subtotal, gstAmount, round2(subtotal + gstAmount), poId);

      return { success: true, message: 'Purchase order created', data: { id: poId } };
    } catch (error: any) {
      return { success: false, message: 'Failed to create PO: ' + error.message };
    }
  }

  getAll(): ApiResponse<PurchaseOrder[]> {
    try {
      const orders = this.db.prepare(`
        SELECT po.*, c.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN contacts c ON po.supplier_id = c.id
        ORDER BY po.date DESC
      `).all();

      const result = (orders as any[]).map(po => {
        const items = this.db.prepare(`
          SELECT poi.*, i.name as item_name
          FROM purchase_order_items poi
          JOIN items i ON poi.item_id = i.id
          WHERE poi.po_id = ?
        `).all(po.id);

        return {
          id: po.id,
          poNo: po.po_no,
          supplierId: po.supplier_id,
          supplierName: po.supplier_name,
          date: po.date,
          expectedDate: po.expected_date,
          status: po.status,
          subtotal: po.subtotal,
          gstAmount: po.gst_amount,
          totalAmount: po.total_amount,
          notes: po.notes,
          taxType: po.tax_type,
          transactionId: po.transaction_id,
          items: (items as any[]).map(i => ({
            id: i.id,
            poId: i.po_id,
            itemId: i.item_id,
            itemName: i.item_name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            gstRate: i.gst_rate,
            gstAmount: i.gst_amount,
            totalAmount: i.total_amount,
          })),
          createdAt: po.created_at,
        };
      });

      return { success: true, data: result as PurchaseOrder[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to get POs: ' + error.message };
    }
  }

  getById(id: number): ApiResponse<PurchaseOrder> {
    try {
      const po = this.db.prepare(`
        SELECT po.*, c.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN contacts c ON po.supplier_id = c.id
        WHERE po.id = ?
      `).get(id) as any;

      if (!po) return { success: false, message: 'Purchase order not found' };

      const items = this.db.prepare(`
        SELECT poi.*, i.name as item_name
        FROM purchase_order_items poi
        JOIN items i ON poi.item_id = i.id
        WHERE poi.po_id = ?
      `).all(id);

      return {
        success: true,
        data: {
          id: po.id,
          poNo: po.po_no,
          supplierId: po.supplier_id,
          supplierName: po.supplier_name,
          date: po.date,
          expectedDate: po.expected_date,
          status: po.status,
          subtotal: po.subtotal,
          gstAmount: po.gst_amount,
          totalAmount: po.total_amount,
          notes: po.notes,
          taxType: po.tax_type,
          transactionId: po.transaction_id,
          items: (items as any[]).map(i => ({
            id: i.id,
            poId: i.po_id,
            itemId: i.item_id,
            itemName: i.item_name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            gstRate: i.gst_rate,
            gstAmount: i.gst_amount,
            totalAmount: i.total_amount,
          })),
          createdAt: po.created_at,
        },
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to get PO: ' + error.message };
    }
  }

  updateStatus(id: number, status: string, paymentMode: string = 'credit', userId: number = 1): ApiResponse {
    try {
      if (status === 'received') {
        const poResult = this.getById(id);
        if (!poResult.success || !poResult.data) {
          return { success: false, message: 'PO not found for receiving' };
        }
        const po = poResult.data;

        // 1. Prepare Accounting Transformation
        const mapping = this.automation.mapAccounts('purchase', paymentMode as any);
        const gstAccountId = this.automation.getGstAccount();

        const lines: EngineTransactionLine[] = [
          // Credit: Supplier Payables or Cash/Bank (Net Amount)
          {
            accountId: mapping.creditAccount,
            description: `Purchase from ${po.supplierName} - ${po.poNo}`,
            debitAmount: 0,
            creditAmount: po.totalAmount
          },
          // Debit: Inventory Asset (Subtotal Only)
          {
            accountId: mapping.debitAccount,
            description: `Inventory Stock Arrival - ${po.poNo}`,
            debitAmount: po.subtotal,
            creditAmount: 0
          }
        ];

        // Add GST Input Line if applicable
        if (po.gstAmount > 0) {
          const isDomestic = po.taxType === 'domestic';
          lines.push({
            accountId: gstAccountId,
            description: `${isDomestic ? 'Domestic ' : ''}Input GST - ${po.poNo}`,
            debitAmount: po.gstAmount,
            creditAmount: 0,
            gstAmount: po.gstAmount,
            gstRate: isDomestic ? (po.items[0]?.gstRate || 2.0) : 5.0,
            gstType: 'input'
          });
        }

        const event: EngineEvent = {
          type: 'purchase',
          contactId: po.supplierId,
          date: format(new Date(), 'yyyy-MM-dd'),
          description: `Received Purchase Order ${po.poNo}`,
          reference: po.poNo,
          paymentMode: paymentMode as any,
          subtotal: po.subtotal,
          gstAmount: po.gstAmount,
          discountAmount: 0,
          netAmount: po.totalAmount,
          taxType: po.taxType || 'standard',
          lines,
          createdBy: userId,
          invoiceDetails: {
            paymentStatus: paymentMode === 'credit' ? 'unpaid' : 'paid',
            notes: po.notes
          }
        };

        // 2. Execute via Accounting Engine
        const engineResult = this.engine.executePipeline(event);
        if (!engineResult.success) {
          return { success: false, message: 'Accounting update failed: ' + engineResult.message };
        }

        const transactionId = engineResult.data.transactionId;

        // 3. Update Inventory stock quantities ONLY (no accounting — already handled by engine above)
        // Using direct DB updates to avoid double-posting transactions and corrupting average_cost
        for (const item of po.items) {
          const currentItem = this.db.prepare('SELECT quantity_in_stock, average_cost FROM items WHERE id = ?').get(item.itemId) as any;
          if (!currentItem) continue;

          const currentQty = currentItem.quantity_in_stock;
          const currentAvgCost = currentItem.average_cost;
          const newQty = item.quantity;
          const newCost = item.unitPrice;

          // Recalculate weighted average cost
          const newAverageCost = (currentQty + newQty) > 0
            ? ((currentQty * currentAvgCost) + (newQty * newCost)) / (currentQty + newQty)
            : newCost;

          // Update stock quantity, average cost, and prices
          if (item.sellingPrice && item.sellingPrice > 0) {
            this.db.prepare(`
              UPDATE items
              SET quantity_in_stock = quantity_in_stock + ?,
                  average_cost = ?,
                  purchase_price = ?,
                  selling_price = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(newQty, newAverageCost, newCost, item.sellingPrice, item.itemId);
          } else {
            this.db.prepare(`
              UPDATE items
              SET quantity_in_stock = quantity_in_stock + ?,
                  average_cost = ?,
                  purchase_price = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(newQty, newAverageCost, newCost, item.itemId);
          }

          // Record stock movement for audit trail only (no transaction created here)
          this.db.prepare(`
            INSERT INTO stock_movements (item_id, type, quantity, unit_cost, total_cost, reference, notes)
            VALUES (?, 'in', ?, ?, ?, ?, ?)
          `).run(item.itemId, newQty, newCost, newQty * newCost, po.poNo, `Received from PO ${po.poNo}`);
        }

        // 4. Update PO record with transaction id
        this.db.prepare(`
          UPDATE purchase_orders 
          SET status = ?, transaction_id = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(status, transactionId, id);

        return { success: true, message: 'Purchase order received and ledger updated' };
      }

      // Default status update (sent, cancelled, etc.)
      this.db.prepare('UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
      return { success: true, message: 'Status updated' };
    } catch (error: any) {
      console.error('PO Status update error:', error);
      return { success: false, message: 'Failed to update status: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM purchase_order_items WHERE po_id = ?').run(id);
      this.db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
      return { success: true, message: 'Purchase order deleted' };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete PO: ' + error.message };
    }
  }
}
