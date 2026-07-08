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
      // Validate month
      if (month < 1 || month > 12) {
        return { success: false, message: 'Invalid month. Must be between 1 and 12.' };
      }

      // Get GST Input (purchases) - exclude voided transactions
      const gstInput = this.db.prepare(`
        SELECT COALESCE(SUM(g.amount), 0) as total
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        WHERE g.type = 'input' AND g.month = ? AND g.year = ? AND t.is_void = 0
      `).get(month, year);

      // Get GST Output (sales) - exclude voided transactions
      const gstOutput = this.db.prepare(`
        SELECT COALESCE(SUM(g.amount), 0) as total
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        WHERE g.type = 'output' AND g.month = ? AND g.year = ? AND t.is_void = 0
      `).get(month, year);

      // Get standard taxable purchases - exclude voided and use DISTINCT to prevent double-counting
      const taxablePurchases = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        LEFT JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'purchase' AND t.is_void = 0
          AND COALESCE(i.tax_type, 'standard') = 'standard'
          AND t.id IN (SELECT DISTINCT g2.transaction_id FROM gst_entries g2 WHERE g2.type = 'input' AND g2.month = ? AND g2.year = ?)
      `).get(month, year);

      // Get standard taxable sales - exclude voided
      const taxableSales = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        LEFT JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'sale' AND t.is_void = 0
          AND COALESCE(i.tax_type, 'standard') = 'standard'
          AND t.id IN (SELECT DISTINCT g2.transaction_id FROM gst_entries g2 WHERE g2.type = 'output' AND g2.month = ? AND g2.year = ?)
      `).get(month, year);

      // Get standard exempt purchases (no GST) - exclude voided
      const exemptPurchases = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount), 0) as total
        FROM transactions t
        LEFT JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'purchase' AND t.gst_amount = 0 AND t.is_void = 0
        AND COALESCE(i.tax_type, 'standard') = 'standard'
        AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      `).get(month.toString().padStart(2, '0'), year.toString());

      // Get standard exempt sales (no GST) - exclude voided
      const exemptSales = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount), 0) as total
        FROM transactions t
        LEFT JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'sale' AND t.gst_amount = 0 AND t.is_void = 0
        AND COALESCE(i.tax_type, 'standard') = 'standard'
        AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      `).get(month.toString().padStart(2, '0'), year.toString());

      // Get domestic sales
      const domesticSales = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'sale' AND t.is_void = 0
        AND i.tax_type = 'domestic'
        AND t.id IN (SELECT DISTINCT transaction_id FROM gst_entries WHERE type = 'output' AND month = ? AND year = ?)
      `).get(month, year);

      // Get domestic GST output
      const domesticGstOutput = this.db.prepare(`
        SELECT COALESCE(SUM(g.amount), 0) as total
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        JOIN invoices i ON i.transaction_id = t.id
        WHERE g.type = 'output' AND g.month = ? AND g.year = ? AND t.is_void = 0
        AND i.tax_type = 'domestic'
      `).get(month, year);

      // Get domestic purchases
      const domesticPurchases = this.db.prepare(`
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'purchase' AND t.is_void = 0
        AND i.tax_type = 'domestic'
        AND t.id IN (SELECT DISTINCT transaction_id FROM gst_entries WHERE type = 'input' AND month = ? AND year = ?)
      `).get(month, year);

      // Get domestic GST input
      const domesticGstInput = this.db.prepare(`
        SELECT COALESCE(SUM(g.amount), 0) as total
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        JOIN invoices i ON i.transaction_id = t.id
        WHERE g.type = 'input' AND g.month = ? AND g.year = ? AND t.is_void = 0
        AND i.tax_type = 'domestic'
      `).get(month, year);

      const inputAmount = (gstInput as any)?.total || 0;
      const outputAmount = (gstOutput as any)?.total || 0;
      
      const domGstOut = (domesticGstOutput as any)?.total || 0;
      const stdGstOut = outputAmount - domGstOut;
      
      const domGstIn = (domesticGstInput as any)?.total || 0;
      const stdGstIn = inputAmount - domGstIn;
      
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
        domesticSales: (domesticSales as any)?.total || 0,
        domesticGstOutput: domGstOut,
        standardGstOutput: stdGstOut,
        domesticPurchases: (domesticPurchases as any)?.total || 0,
        domesticGstInput: domGstIn,
        standardGstInput: stdGstIn,
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
          g.month,
          g.year,
          SUM(CASE WHEN g.type = 'input' THEN g.amount ELSE 0 END) as gst_input,
          SUM(CASE WHEN g.type = 'output' THEN g.amount ELSE 0 END) as gst_output,
          SUM(CASE WHEN g.type = 'output' THEN g.amount ELSE -g.amount END) as net_gst,
          MAX(g.is_filed) as is_filed
        FROM gst_entries g
        JOIN transactions t ON g.transaction_id = t.id
        WHERE t.is_void = 0
        GROUP BY g.year, g.month
        ORDER BY g.year DESC, g.month DESC
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
    return this.updateGSTStatus(month, year, true);
  }

  /**
   * Update GST filing status for a specific month/year
   */
  updateGSTStatus(month: number, year: number, isFiled: boolean): ApiResponse {
    try {
      this.db.prepare(`
        UPDATE gst_entries
        SET is_filed = ?, filed_at = ?
        WHERE month = ? AND year = ?
          AND transaction_id IN (SELECT id FROM transactions WHERE is_void = 0)
      `).run(isFiled ? 1 : 0, isFiled ? new Date().toISOString() : null, month, year);

      return { 
        success: true, 
        message: `GST return marked as ${isFiled ? 'filed' : 'pending'} successfully` 
      };
    } catch (error: any) {
      console.error('Update GST status error:', error);
      return { success: false, message: 'Failed to update GST status: ' + error.message };
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
        WHERE g.type = 'input' AND g.month = ? AND g.year = ? AND t.is_void = 0
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
        WHERE g.type = 'output' AND g.month = ? AND g.year = ? AND t.is_void = 0
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
