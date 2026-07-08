import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { BarcodeMapping, ApiResponse } from '../types';

export class BarcodeService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  create(barcode: string, itemId: number): ApiResponse {
    try {
      this.db.prepare('INSERT INTO barcode_mappings (barcode, item_id) VALUES (?, ?)').run(barcode, itemId);
      return { success: true, message: 'Barcode mapped' };
    } catch (error: any) {
      return { success: false, message: 'Failed to map barcode: ' + error.message };
    }
  }

  getAll(): ApiResponse<BarcodeMapping[]> {
    try {
      const mappings = this.db.prepare(`
        SELECT bm.*, i.name as item_name, i.code as item_code
        FROM barcode_mappings bm
        LEFT JOIN items i ON bm.item_id = i.id
        ORDER BY bm.created_at DESC
      `).all();
      return { success: true, data: mappings as BarcodeMapping[] };
    } catch (error: any) {
      return { success: false, message: 'Failed to get mappings: ' + error.message };
    }
  }

  findByBarcode(barcode: string): ApiResponse<BarcodeMapping> {
    try {
      const mapping = this.db.prepare(`
        SELECT bm.*, i.name as item_name FROM barcode_mappings bm LEFT JOIN items i ON bm.item_id = i.id WHERE bm.barcode = ?
      `).get(barcode);
      return mapping ? { success: true, data: mapping as BarcodeMapping } : { success: false, message: 'Not found' };
    } catch (error: any) {
      return { success: false, message: 'Search failed: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('DELETE FROM barcode_mappings WHERE id = ?').run(id);
      return { success: true, message: 'Deleted' };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete: ' + error.message };
    }
  }
}
