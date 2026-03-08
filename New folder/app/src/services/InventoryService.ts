import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import { format } from 'date-fns';
import type {
  Item,
  CreateItemData,
  AddStockData,
  StockMovement,
  ApiResponse,
  ItemCategory,
  ItemUnit
} from '../types';

import { AutomationService } from './AutomationService';

/**
 * InventoryService - Manages stock, items, and inventory operations
 * Uses Average Cost Method for COGS calculation
 */
export class InventoryService {
  private db: Database.Database;
  private automation: AutomationService;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
    this.automation = new AutomationService(dbManager);
  }

  // ============================================
  // ITEM MANAGEMENT
  // ============================================

  createItem(data: CreateItemData): ApiResponse<Item> {
    return this.db.transaction(() => {
      try {
        if (!data.name) {
          return { success: false, message: 'Item name is required' };
        }

        const code = data.code || this.generateItemCode();
        const existing = this.db.prepare('SELECT 1 FROM items WHERE code = ?').get(code);
        if (existing) {
          return { success: false, message: 'Item code already exists' };
        }

        const openingStock = data.openingStock || 0;
        const openingPrice = data.openingPurchasePrice || data.purchasePrice || 0;

        const result = this.db.prepare(`
          INSERT INTO items 
          (code, name, description, category, unit, purchase_price, selling_price, reorder_level, gst_applicable, gst_rate, quantity_in_stock, average_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code,
          data.name,
          data.description || null,
          data.category || null,
          data.unit || 'pcs',
          data.purchasePrice || data.openingPurchasePrice || 0,
          data.sellingPrice || 0,
          data.reorderLevel || 10,
          data.gstApplicable !== false ? 1 : 0,
          data.gstRate || 5.0,
          openingStock,
          openingPrice
        );

        const itemId = result.lastInsertRowid as number;

        if (openingStock > 0) {
          const totalCost = openingStock * openingPrice;

          this.db.prepare(`
            INSERT INTO stock_movements (item_id, type, quantity, unit_cost, total_cost, notes)
            VALUES (?, 'in', ?, ?, ?, 'Opening Stock')
          `).run(itemId, openingStock, openingPrice, totalCost);

          const transactionId = (this.db.prepare(`
            INSERT INTO transactions (transaction_no, type, date, description, total_amount, net_amount, status)
            VALUES (?, 'journal', ?, ?, ?, ?, 'completed')
          `).run(
            this.generateTransactionNo('JV'),
            format(new Date(), 'yyyy-MM-dd'),
            `Opening Stock - ${data.name}`,
            totalCost,
            totalCost
          ).lastInsertRowid) as number;

          const invAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1400'").get();
          const equityAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '3100'").get();

          if (invAccount && equityAccount) {
            this.db.prepare(`
              INSERT INTO transaction_lines (transaction_id, account_id, description, debit_amount)
              VALUES (?, ?, 'Opening Stock', ?)
            `).run(transactionId, (invAccount as any).id, totalCost);

            this.db.prepare(`
              INSERT INTO transaction_lines (transaction_id, account_id, description, credit_amount)
              VALUES (?, ?, 'Opening Stock Counterpart', ?)
            `).run(transactionId, (equityAccount as any).id, totalCost);
          }
        }

        const item = this.getItemById(itemId);
        return { success: true, data: item, message: 'Item created successfully' };
      } catch (error: any) {
        console.error('Create item error:', error);
        throw error; // Rethrow to rollback transaction
      }
    })();
  }

  getItemById(id: number): Item | undefined {
    try {
      const item = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
      if (!item) return undefined;
      return this.mapItemFromDb(item);
    } catch (error) {
      console.error('Get item error:', error);
      return undefined;
    }
  }

  getAllItems(): Item[] {
    try {
      const items = this.db.prepare('SELECT * FROM items WHERE is_active = 1 ORDER BY name').all();
      return items.map((i: any) => this.mapItemFromDb(i));
    } catch (error) {
      console.error('Get all items error:', error);
      return [];
    }
  }

  searchItems(query: string): Item[] {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const searchTerm = `%${query}%`;
      const items = this.db.prepare(`
        SELECT * FROM items 
        WHERE is_active = 1 
        AND (name LIKE ? OR code LIKE ? OR category LIKE ?)
        ORDER BY name
        LIMIT 20
      `).all(searchTerm, searchTerm, searchTerm);

      return items.map((i: any) => this.mapItemFromDb(i));
    } catch (error) {
      console.error('Search items error:', error);
      return [];
    }
  }

  updateItem(id: number, data: Partial<CreateItemData>): ApiResponse {
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

      this.db.prepare(`UPDATE items SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

      return { success: true, message: 'Item updated successfully' };
    } catch (error: any) {
      console.error('Update item error:', error);
      return { success: false, message: 'Failed to update item: ' + error.message };
    }
  }

  deleteItem(id: number): ApiResponse {
    try {
      // Prevent deletion if items are used in history
      this.automation.preventInvalidDeletion('item', id);

      this.db.prepare('DELETE FROM items WHERE id = ?').run(id);
      return { success: true, message: 'Item deleted successfully' };
    } catch (error: any) {
      // If error is about history, it's a known business rule, not a system failure
      if (error.message.includes('history')) {
        console.log('Item deactivation triggered (has related records and history):', id);
        this.db.prepare('UPDATE items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: true, message: 'Item deactivated (has related records and history)' };
      }

      console.error('Delete item error:', error);
      return { success: false, message: 'Failed to delete item: ' + error.message };
    }
  }

  getLowStockItems(): Item[] {
    try {
      const items = this.db.prepare(`
        SELECT * FROM items 
        WHERE is_active = 1 
        AND quantity_in_stock <= reorder_level
        ORDER BY quantity_in_stock ASC
      `).all();

      return items.map((i: any) => this.mapItemFromDb(i));
    } catch (error) {
      console.error('Get low stock error:', error);
      return [];
    }
  }

  // ============================================
  // CATEGORY & UNIT MANAGEMENT
  // ============================================

  getCategories(): ItemCategory[] {
    try {
      return this.db.prepare('SELECT * FROM item_categories ORDER BY name').all() as ItemCategory[];
    } catch (error) {
      console.error('Get categories error:', error);
      return [];
    }
  }

  createCategory(name: string): ApiResponse<ItemCategory> {
    try {
      const result = this.db.prepare('INSERT INTO item_categories (name) VALUES (?)').run(name);
      const newCat = this.db.prepare('SELECT * FROM item_categories WHERE id = ?').get(result.lastInsertRowid) as ItemCategory;
      return { success: true, data: newCat, message: 'Category created successfully' };
    } catch (error: any) {
      console.error('Create category error:', error);
      return { success: false, message: 'Failed to create category: ' + error.message };
    }
  }

  deleteCategory(id: number): ApiResponse {
    try {
      // Check if any items use this category
      const category = this.db.prepare('SELECT name FROM item_categories WHERE id = ?').get(id) as any;
      if (category) {
        const inUse = this.db.prepare('SELECT 1 FROM items WHERE category = ? LIMIT 1').get(category.name);
        if (inUse) {
          return { success: false, message: 'Category is in use and cannot be deleted' };
        }
      }
      this.db.prepare('DELETE FROM item_categories WHERE id = ?').run(id);
      return { success: true, message: 'Category deleted successfully' };
    } catch (error: any) {
      console.error('Delete category error:', error);
      return { success: false, message: 'Failed to delete category: ' + error.message };
    }
  }

  getUnits(): ItemUnit[] {
    try {
      return this.db.prepare('SELECT * FROM item_units ORDER BY name').all() as ItemUnit[];
    } catch (error) {
      console.error('Get units error:', error);
      return [];
    }
  }

  createUnit(name: string): ApiResponse<ItemUnit> {
    try {
      const result = this.db.prepare('INSERT INTO item_units (name) VALUES (?)').run(name);
      const newUnit = this.db.prepare('SELECT * FROM item_units WHERE id = ?').get(result.lastInsertRowid) as ItemUnit;
      return { success: true, data: newUnit, message: 'Unit created successfully' };
    } catch (error: any) {
      console.error('Create unit error:', error);
      return { success: false, message: 'Failed to create unit: ' + error.message };
    }
  }

  deleteUnit(id: number): ApiResponse {
    try {
      // Check if any items use this unit
      const unit = this.db.prepare('SELECT name FROM item_units WHERE id = ?').get(id) as any;
      if (unit) {
        const inUse = this.db.prepare('SELECT 1 FROM items WHERE unit = ? LIMIT 1').get(unit.name);
        if (inUse) {
          return { success: false, message: 'Unit is in use and cannot be deleted' };
        }
      }
      this.db.prepare('DELETE FROM item_units WHERE id = ?').run(id);
      return { success: true, message: 'Unit deleted successfully' };
    } catch (error: any) {
      console.error('Delete unit error:', error);
      return { success: false, message: 'Failed to delete unit: ' + error.message };
    }
  }

  // ============================================
  // STOCK MANAGEMENT
  // ============================================

  addStock(data: AddStockData): ApiResponse {
    return this.db.transaction(() => {
      try {
        if (data.quantity <= 0) {
          return { success: false, message: 'Quantity must be greater than zero' };
        }

        let itemId = data.itemId;

        // Create new item if itemId not provided
        if (!itemId && data.itemName) {
          const existingItem = this.db.prepare('SELECT id FROM items WHERE name = ? AND is_active = 1').get(data.itemName);
          if (existingItem) {
            itemId = (existingItem as any).id;
          } else {
            const newItemResult = this.createItem({
              name: data.itemName,
              purchasePrice: data.purchasePrice,
              sellingPrice: data.sellingPrice,
              gstApplicable: data.gstApplicable,
              gstRate: data.gstRate,
            });

            if (newItemResult.success && newItemResult.data) {
              itemId = newItemResult.data.id;
            } else {
              return { success: false, message: newItemResult.message || 'Failed to create item' };
            }
          }
        }

        if (!itemId) {
          return { success: false, message: 'Item ID or name is required' };
        }

        const item = this.db.prepare('SELECT quantity_in_stock, average_cost, gst_rate FROM items WHERE id = ?').get(itemId) as any;
        if (!item) return { success: false, message: 'Item not found' };

        const currentQty = item.quantity_in_stock;
        const currentAvgCost = item.average_cost;
        const newQty = data.quantity;
        const newCost = data.purchasePrice;

        let newAverageCost = currentAvgCost;
        if (currentQty + newQty > 0) {
          newAverageCost = ((currentQty * currentAvgCost) + (newQty * newCost)) / (currentQty + newQty);
        } else {
          newAverageCost = newCost;
        }

        this.db.prepare(`
          UPDATE items 
          SET quantity_in_stock = quantity_in_stock + ?,
              average_cost = ?,
              purchase_price = ?,
              selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newQty, newAverageCost, newCost, data.sellingPrice || 0, data.sellingPrice || 0, itemId);

        const totalCost = newQty * newCost;
        this.db.prepare(`
          INSERT INTO stock_movements (item_id, type, quantity, unit_cost, total_cost, reference, notes)
          VALUES (?, 'in', ?, ?, ?, ?, ?)
        `).run(itemId, newQty, newCost, totalCost, data.reference || null, data.notes || 'Purchased Stock');

        const gstRate = data.gstRate || item.gst_rate || 5.0;
        const gstAmount = data.gstApplicable ? (totalCost * gstRate / 100) : 0;
        const totalAmount = totalCost + gstAmount;

        const transactionId = (this.db.prepare(`
          INSERT INTO transactions (transaction_no, type, date, reference, contact_id, description, total_amount, gst_amount, net_amount, payment_mode, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `).run(
          this.generateTransactionNo(data.paymentMode === 'credit' ? 'PUR' : 'PV'),
          data.paymentMode === 'credit' ? 'purchase' : 'payment',
          format(new Date(), 'yyyy-MM-dd'),
          data.reference || null,
          data.supplierId || null,
          `Stock Purchase - ${data.itemName || 'Multiple Items'}`,
          totalAmount,
          gstAmount,
          totalAmount,
          data.paymentMode
        ).lastInsertRowid) as number;

        this.createPurchaseAccountingEntries(transactionId, data, totalAmount, totalCost, gstAmount);

        if (data.paymentMode === 'credit' && data.supplierId) {
          this.db.prepare('UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?').run(totalAmount, data.supplierId);
        }

        if (gstAmount > 0) {
          this.db.prepare(`
            INSERT INTO gst_entries (transaction_id, type, amount, rate, month, year)
            VALUES (?, 'input', ?, ?, ?, ?)
          `).run(transactionId, gstAmount, gstRate, new Date().getMonth() + 1, new Date().getFullYear());
        }

        return { success: true, message: 'Stock added successfully' };
      } catch (error: any) {
        console.error('Add stock error:', error);
        throw error;
      }
    })();
  }

  adjustStock(itemId: number, quantity: number, reason: string, reference?: string): ApiResponse {
    try {
      const item = this.getItemById(itemId);

      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      const currentQty = item.quantityInStock;
      const newQty = currentQty + quantity;

      if (newQty < 0) {
        return { success: false, message: 'Adjustment would result in negative stock' };
      }

      const transactionNo = this.generateTransactionNo('ADJ');
      const date = format(new Date(), 'yyyy-MM-dd');

      const transactionResult = this.db.prepare(`
        INSERT INTO transactions(transaction_no, type, date, description, total_amount, net_amount, reference)
        VALUES(?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionNo,
        'adjustment',
        date,
        `Stock Adjustment - ${item.name}: ${reason} `,
        0,
        0,
        reference || null
      );

      const transactionId = transactionResult.lastInsertRowid as number;

      // Record stock movement
      this.db.prepare(`
        INSERT INTO stock_movements(item_id, transaction_id, type, quantity, unit_cost, total_cost, reference, notes)
        VALUES(?, ?, 'adjustment', ?, ?, ?, ?, ?)
      `).run(
        itemId,
        transactionId,
        quantity,
        item.averageCost,
        quantity * item.averageCost,
        reference || `Adjustment #${transactionNo} `,
        reason
      );

      // Update item quantity
      this.db.prepare('UPDATE items SET quantity_in_stock = ? WHERE id = ?').run(newQty, itemId);

      return { success: true, message: 'Stock adjusted successfully' };
    } catch (error: any) {
      console.error('Adjust stock error:', error);
      return { success: false, message: 'Failed to adjust stock: ' + error.message };
    }
  }

  getStockMovements(itemId?: number): StockMovement[] {
    try {
      let query = `
        SELECT
        sm.*,
          i.name as item_name,
          i.code as item_code,
          t.transaction_no
        FROM stock_movements sm
        JOIN items i ON sm.item_id = i.id
        LEFT JOIN transactions t ON sm.transaction_id = t.id
        WHERE 1 = 1
          `;
      const params: any[] = [];

      if (itemId) {
        query += ' AND sm.item_id = ?';
        params.push(itemId);
      }

      query += ' ORDER BY sm.created_at DESC';

      const movements = this.db.prepare(query).all(...params);
      return movements.map((m: any) => ({
        id: m.id,
        itemId: m.item_id,
        transactionId: m.transaction_id,
        type: m.type,
        quantity: m.quantity,
        unitCost: m.unit_cost,
        totalCost: m.total_cost,
        reference: m.reference,
        notes: m.notes,
        createdAt: m.created_at,
      }));
    } catch (error) {
      console.error('Get stock movements error:', error);
      return [];
    }
  }

  getStockValuation(): { totalValue: number; totalQuantity: number; itemCount: number } {
    try {
      const result = this.db.prepare(`
        SELECT
        COALESCE(SUM(quantity_in_stock * average_cost), 0) as total_value,
          COALESCE(SUM(quantity_in_stock), 0) as total_quantity,
          COUNT(*) as item_count
        FROM items
        WHERE is_active = 1
          `).get();

      return {
        totalValue: (result as any)?.total_value || 0,
        totalQuantity: (result as any)?.total_quantity || 0,
        itemCount: (result as any)?.item_count || 0,
      };
    } catch (error) {
      console.error('Get stock valuation error:', error);
      return { totalValue: 0, totalQuantity: 0, itemCount: 0 };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateItemCode(): string {
    const lastItem = this.db.prepare('SELECT code FROM items WHERE code IS NOT NULL ORDER BY id DESC LIMIT 1').get();

    let sequence = 1;
    if (lastItem && (lastItem as any).code) {
      const match = (lastItem as any).code.match(/(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `ITM-${sequence.toString().padStart(4, '0')}`;
  }

  private generateTransactionNo(type: string): string {
    const date = new Date();
    const year = date.getFullYear();

    const lastTransaction = this.db.prepare(`
      SELECT transaction_no FROM transactions 
      WHERE transaction_no LIKE ?
          ORDER BY id DESC LIMIT 1
    `).get(`${type} -${year} -% `);

    let sequence = 1;
    if (lastTransaction) {
      const parts = (lastTransaction as any).transaction_no.split('-');
      sequence = parseInt(parts[2]) + 1;
    }

    return `${type}-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  private createPurchaseAccountingEntries(
    transactionId: number,
    data: AddStockData,
    totalAmount: number,
    purchaseCost: number,
    gstAmount: number
  ): void {
    // 1. Debit: Inventory Account
    const inventoryAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1400'").get();
    if (inventoryAccount) {
      this.db.prepare(`
        INSERT INTO transaction_lines(transaction_id, account_id, description, debit_amount)
        VALUES(?, ?, ?, ?)
          `).run(transactionId, (inventoryAccount as any).id, 'Inventory Purchase', purchaseCost);
    }

    // 2. Debit: GST Input (if applicable)
    if (gstAmount > 0) {
      const gstAccount = this.db.prepare("SELECT id FROM accounts WHERE code = '1500'").get();
      if (gstAccount) {
        this.db.prepare(`
          INSERT INTO transaction_lines(transaction_id, account_id, description, debit_amount, gst_amount, gst_type)
        VALUES(?, ?, ?, ?, ?, ?)
          `).run(transactionId, (gstAccount as any).id, 'GST Input', gstAmount, gstAmount, 'input');
      }
    }

    // 3. Credit: Cash/Bank or Supplier Account
    if (data.paymentMode === 'credit' && data.supplierId) {
      const supplier = this.db.prepare('SELECT account_id FROM contacts WHERE id = ?').get(data.supplierId);
      if (supplier) {
        this.db.prepare(`
          INSERT INTO transaction_lines(transaction_id, account_id, contact_id, description, credit_amount)
        VALUES(?, ?, ?, ?, ?)
          `).run(transactionId, (supplier as any).account_id, data.supplierId, 'Purchase on Credit', totalAmount);
      }
    } else {
      const paymentAccountCode = data.paymentMode === 'bank' ? '1200' : '1100';
      const paymentAccount = this.db.prepare('SELECT id FROM accounts WHERE code = ?').get(paymentAccountCode);
      if (paymentAccount) {
        this.db.prepare(`
          INSERT INTO transaction_lines(transaction_id, account_id, description, credit_amount)
        VALUES(?, ?, ?, ?)
        `).run(transactionId, (paymentAccount as any).id, `Purchase - ${data.paymentMode} `, totalAmount);
      }
    }
  }

  private mapItemFromDb(row: any): Item {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      unit: row.unit,
      purchasePrice: row.purchase_price,
      sellingPrice: row.selling_price,
      averageCost: row.average_cost,
      quantityInStock: row.quantity_in_stock,
      reorderLevel: row.reorder_level,
      gstApplicable: row.gst_applicable === 1,
      gstRate: row.gst_rate,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
