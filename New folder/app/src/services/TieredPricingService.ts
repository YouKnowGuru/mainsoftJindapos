import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { PriceList, CreatePriceListData, ApiResponse } from '../types';

export class TieredPricingService {
  private db: Database.Database;
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.db = dbManager.getDatabase();
  }

  /**
   * Create a new price list (e.g., Wholesale, Dealer)
   */
  createPriceList(data: CreatePriceListData): ApiResponse<{ id: number }> {
    try {
      // Wrap in transaction to prevent partial writes
      const result = this.dbManager.safeTransaction(() => {
        // Check for duplicate name
        const existing = this.db.prepare('SELECT id FROM price_lists WHERE name = ? AND is_active = 1').get(data.name) as any;
        if (existing) {
          throw new Error(`Price list "${data.name}" already exists`);
        }

        const listResult = this.db.prepare(`
          INSERT INTO price_lists (name, customer_type) VALUES (?, ?)
        `).run(data.name, data.customerType || null);

        const priceListId = listResult.lastInsertRowid as number;

        const insertItem = this.db.prepare(`
          INSERT INTO price_list_items (price_list_id, item_id, price) VALUES (?, ?, ?)
        `);

        for (const item of data.items) {
          insertItem.run(priceListId, item.itemId, item.price);
        }

        return { success: true, message: 'Price list created', data: { id: priceListId } };
      });

      return result;
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  /**
   * Update an existing price list
   */
  updatePriceList(id: number, data: CreatePriceListData): ApiResponse {
    try {
      return this.dbManager.safeTransaction(() => {
        // Check if exists
        const existing = this.db.prepare('SELECT id FROM price_lists WHERE id = ? AND is_active = 1').get(id) as any;
        if (!existing) {
          throw new Error('Price list not found');
        }

        // Update name
        this.db.prepare('UPDATE price_lists SET name = ?, customer_type = ? WHERE id = ?')
          .run(data.name, data.customerType || null, id);

        // Delete old items
        this.db.prepare('DELETE FROM price_list_items WHERE price_list_id = ?').run(id);

        // Insert new items
        const insertItem = this.db.prepare(`
          INSERT INTO price_list_items (price_list_id, item_id, price) VALUES (?, ?, ?)
        `);

        for (const item of data.items) {
          insertItem.run(id, item.itemId, item.price);
        }

        return { success: true, message: 'Price list updated' };
      });
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  /**
   * Get all price lists
   */
  getAllPriceLists(): ApiResponse<PriceList[]> {
    try {
      const lists = this.db.prepare(`
        SELECT * FROM price_lists WHERE is_active = 1 ORDER BY name ASC
      `).all();

      const result = (lists as any[]).map(list => {
        const items = this.db.prepare(`
          SELECT pli.*, i.name as item_name, i.code as item_code
          FROM price_list_items pli
          JOIN items i ON pli.item_id = i.id
          WHERE pli.price_list_id = ?
          ORDER BY i.name ASC
        `).all(list.id);

        return {
          id: list.id,
          name: list.name,
          customerType: list.customer_type,
          isActive: list.is_active === 1,
          items: (items as any[]).map(i => ({
            id: i.id,
            priceListId: i.price_list_id,
            itemId: i.item_id,
            itemName: i.item_name,
            price: i.price,
          })),
          createdAt: list.created_at,
        };
      });

      return { success: true, data: result as PriceList[] };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  /**
   * Get price for a specific item in a price list
   */
  getItemPrice(itemId: number, priceListId?: number): ApiResponse<number> {
    try {
      if (priceListId) {
        const price = this.db.prepare('SELECT price FROM price_list_items WHERE price_list_id = ? AND item_id = ?').get(priceListId, itemId) as any;
        return { success: true, data: price?.price || 0 };
      }

      // Fallback to item's default selling price
      const item = this.db.prepare('SELECT selling_price FROM items WHERE id = ?').get(itemId) as any;
      return { success: true, data: item?.selling_price || 0 };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  /**
   * Get customer's applicable price list
   */
  getCustomerPriceList(customerId: number): ApiResponse<number | null> {
    try {
      const customer = this.db.prepare('SELECT price_list_id FROM contacts WHERE id = ?').get(customerId) as any;
      return { success: true, data: customer?.price_list_id || null };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  /**
   * Assign price list to customer
   */
  assignPriceListToCustomer(customerId: number, priceListId: number | null): ApiResponse {
    try {
      // Validate customer exists
      const customer = this.db.prepare('SELECT id FROM contacts WHERE id = ?').get(customerId) as any;
      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }

      // Validate price list if provided
      if (priceListId) {
        const priceList = this.db.prepare('SELECT id FROM price_lists WHERE id = ? AND is_active = 1').get(priceListId) as any;
        if (!priceList) {
          return { success: false, message: 'Price list not found or inactive' };
        }
      }

      this.db.prepare('UPDATE contacts SET price_list_id = ? WHERE id = ?').run(priceListId, customerId);
      return { success: true, message: priceListId ? 'Price list assigned' : 'Price list removed' };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  deletePriceList(id: number): ApiResponse {
    try {
      return this.dbManager.safeTransaction(() => {
        // Check if exists
        const existing = this.db.prepare('SELECT id FROM price_lists WHERE id = ? AND is_active = 1').get(id) as any;
        if (!existing) {
          throw new Error('Price list not found');
        }

        // Soft delete
        this.db.prepare('UPDATE price_lists SET is_active = 0 WHERE id = ?').run(id);

        // Clean up orphaned items
        this.db.prepare('DELETE FROM price_list_items WHERE price_list_id = ?').run(id);

        return { success: true, message: 'Price list deleted' };
      });
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }
}
