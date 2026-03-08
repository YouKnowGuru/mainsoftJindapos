import { DatabaseManager } from '../database/DatabaseManager';
import Database from 'better-sqlite3';
import type { GSTSummary, ApiResponse } from '../types';

/**
 * GSTService - Manages Bhutan 5% GST calculations and returns
 */
export class GSTService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  /**
   * Get GST summary for a specific month and year
   */
  getGSTSummary(month: number, year: number): ApiResponse<GSTSummary> {
    try {
      // Get GST Input (purchases)
      const gstInput = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM gst_entries
        WHERE type = 'input' AND month = ? AND year = ?
      `).get(month, year);

      // Get GST Output (sales)
      const gstOutput = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM gst_entries
        WHERE type = 'output' AND month = ? AND year = ?
      `).get(month, year);

      // Get taxable purchases
      const taxablePurchases = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        JOIN gst_entries g ON t.id = g.transaction_id
        WHERE g.type = 'input' AND g.month = ? AND g.year = ?
      `).get(month, year);

      // Get taxable sales
      const taxableSales = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        JOIN gst_entries g ON t.id = g.transaction_id
        WHERE g.type = 'output' AND g.month = ? AND g.year = ?
      `).get(month, year);

      // Get exempt purchases (no GST)
      const exemptPurchases = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'purchase' AND gst_amount = 0
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(month.toString().padStart(2, '0'), year.toString());

      // Get exempt sales (no GST)
      const exemptSales = this.db.prepare(`
        SELECT COALESCE(SUM(net_amount), 0) as total
        FROM transactions
        WHERE type = 'sale' AND gst_amount = 0
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).get(month.toString().padStart(2, '0'), year.toString());

      const inputAmount = (gstInput as any)?.total || 0;
      const outputAmount = (gstOutput as any)?.total || 0;
      const payable = outputAmount - inputAmount;

      const summary: GSTSummary = {
        month,
        year,
        gstInput: inputAmount,
        gstOutput: outputAmount,
        gstPayable: payable > 0 ? payable : 0,
        gstCredit: payable < 0 ? Math.abs(payable) : 0,
        taxablePurchases: (taxablePurchases as any)?.total || 0,
        taxableSales: (taxableSales as any)?.total || 0,
        exemptPurchases: (exemptPurchases as any)?.total || 0,
        exemptSales: (exemptSales as any)?.total || 0,
      };

      return { success: true, data: summary };
    } catch (error: any) {
      console.error('Get GST summary error:', error);
      return { success: false, message: 'Failed to get GST summary: ' + error.message };
    }
  }

  /**
   * Get all GST returns history
   */
  getGSTReturns(): ApiResponse<any[]> {
    try {
      const returns = this.db.prepare(`
        SELECT 
          month,
          year,
          SUM(CASE WHEN type = 'input' THEN amount ELSE 0 END) as gst_input,
          SUM(CASE WHEN type = 'output' THEN amount ELSE 0 END) as gst_output,
          SUM(CASE WHEN type = 'output' THEN amount ELSE -amount END) as net_gst,
          MAX(is_filed) as is_filed
        FROM gst_entries
        GROUP BY year, month
        ORDER BY year DESC, month DESC
      `).all();

      return { success: true, data: returns as any[] };
    } catch (error: any) {
      console.error('Get GST returns error:', error);
      return { success: false, message: 'Failed to get GST returns: ' + error.message };
    }
  }

  /**
   * File GST return for a specific month/year
   */
  fileGSTReturn(month: number, year: number): ApiResponse {
    try {
      this.db.prepare(`
        UPDATE gst_entries
        SET is_filed = 1, filed_at = CURRENT_TIMESTAMP
        WHERE month = ? AND year = ?
      `).run(month, year);

      return { success: true, message: 'GST return filed successfully' };
    } catch (error: any) {
      console.error('File GST return error:', error);
      return { success: false, message: 'Failed to file GST return: ' + error.message };
    }
  }

  /**
   * Get detailed GST entries for a period
   */
  getGSTDetails(month: number, year: number): ApiResponse<{ inputEntries: any[]; outputEntries: any[] }> {
    try {
      const inputEntries = this.db.prepare(`
        SELECT 
          g.*,
          t.transaction_no,
          t.date,
          t.description,
          c.name as contact_name
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE g.type = 'input' AND g.month = ? AND g.year = ?
        ORDER BY t.date
      `).all(month, year);

      const outputEntries = this.db.prepare(`
        SELECT 
          g.*,
          t.transaction_no,
          t.date,
          t.description,
          c.name as contact_name
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        WHERE g.type = 'output' AND g.month = ? AND g.year = ?
        ORDER BY t.date
      `).all(month, year);

      return {
        success: true,
        data: {
          inputEntries: inputEntries as any[],
          outputEntries: outputEntries as any[]
        }
      };
    } catch (error: any) {
      console.error('Get GST details error:', error);
      return { success: false, message: 'Failed to get GST details: ' + error.message };
    }
  }
}
