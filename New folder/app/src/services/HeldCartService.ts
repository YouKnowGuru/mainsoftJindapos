import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import { format } from 'date-fns';
import type { HeldCart, HeldCartItem, ApiResponse } from '../types';

export class HeldCartService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  /**
   * Save a cart for later
   */
  saveCart(cartName: string, customerId: number | undefined, items: HeldCartItem[]): ApiResponse<{ cartId: number }> {
    try {
      const result = this.db.prepare(`
        INSERT INTO held_carts (cart_name, customer_id)
        VALUES (?, ?)
      `).run(cartName, customerId || null);

      const cartId = result.lastInsertRowid as number;

      const insertItem = this.db.prepare(`
        INSERT INTO held_cart_items (cart_id, item_id, quantity, unit_price, gst_rate)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItem.run(cartId, item.itemId, item.quantity, item.unitPrice, item.gstRate);
      }

      return { success: true, message: 'Cart saved', data: { cartId } };
    } catch (error: any) {
      console.error('Save cart error:', error);
      return { success: false, message: 'Failed to save cart: ' + error.message };
    }
  }

  /**
   * Get all held carts
   */
  getAllCarts(): ApiResponse<HeldCart[]> {
    try {
      const carts = this.db.prepare(`
        SELECT hc.*, c.name as customer_name
        FROM held_carts hc
        LEFT JOIN contacts c ON hc.customer_id = c.id
        ORDER BY hc.created_at DESC
      `).all();

      const result = (carts as any[]).map(cart => {
        const items = this.db.prepare(`
          SELECT hci.*, i.name as item_name
          FROM held_cart_items hci
          JOIN items i ON hci.item_id = i.id
          WHERE hci.cart_id = ?
        `).all(cart.id);

        return {
          id: cart.id,
          cartName: cart.cart_name,
          customerId: cart.customer_id,
          customerName: cart.customer_name,
          items: (items as any[]).map(i => ({
            itemId: i.item_id,
            itemName: i.item_name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            gstRate: i.gst_rate,
          })),
          createdAt: cart.created_at,
        };
      });

      return { success: true, data: result as HeldCart[] };
    } catch (error: any) {
      console.error('Get carts error:', error);
      return { success: false, message: 'Failed to get held carts: ' + error.message };
    }
  }

  /**
   * Load a held cart back to POS
   */
  loadCart(cartId: number): ApiResponse<HeldCart> {
    try {
      const cart = this.db.prepare(`
        SELECT hc.*, c.name as customer_name
        FROM held_carts hc
        LEFT JOIN contacts c ON hc.customer_id = c.id
        WHERE hc.id = ?
      `).get(cartId) as any;

      if (!cart) {
        return { success: false, message: 'Cart not found' };
      }

      const items = this.db.prepare(`
        SELECT hci.*, i.name as item_name
        FROM held_cart_items hci
        JOIN items i ON hci.item_id = i.id
        WHERE hci.cart_id = ?
      `).all(cartId);

      return {
        success: true,
        data: {
          id: cart.id,
          cartName: cart.cart_name,
          customerId: cart.customer_id,
          customerName: cart.customer_name,
          items: (items as any[]).map(i => ({
            itemId: i.item_id,
            itemName: i.item_name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            gstRate: i.gst_rate,
          })),
          createdAt: cart.created_at,
        },
      };
    } catch (error: any) {
      console.error('Load cart error:', error);
      return { success: false, message: 'Failed to load cart: ' + error.message };
    }
  }

  /**
   * Delete a held cart (after retrieving)
   */
  deleteCart(cartId: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM held_cart_items WHERE cart_id = ?').run(cartId);
      this.db.prepare('DELETE FROM held_carts WHERE id = ?').run(cartId);
      return { success: true, message: 'Cart removed' };
    } catch (error: any) {
      console.error('Delete cart error:', error);
      return { success: false, message: 'Failed to delete cart: ' + error.message };
    }
  }

  /**
   * Get cart count
   */
  getCartCount(): ApiResponse<number> {
    try {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM held_carts').get() as any;
      return { success: true, data: result.count };
    } catch (error: any) {
      return { success: false, message: 'Failed to get cart count: ' + error.message };
    }
  }
}
