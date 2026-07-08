import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { AgedReport, AgedEntry, ApiResponse } from '../types';

export class AgedReportService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  /**
   * Generate aged receivables report (money owed to us by customers)
   */
  getAgedReceivables(asOfDate?: string): ApiResponse<AgedReport> {
    try {
      const date = asOfDate || new Date().toISOString().split('T')[0];

      const customers = this.db.prepare(`
        SELECT
          c.id, c.name, c.current_balance,
          MAX(COALESCE(i.due_date, i.date)) as last_due_date,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 0 AND 30 THEN i.balance_due ELSE 0 END) as current,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) as days31_60,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) as days61_90,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) > 90 THEN i.balance_due ELSE 0 END) as over90
        FROM contacts c
        JOIN invoices i ON c.id = i.contact_id
        WHERE c.type = 'customer'
        AND i.payment_status IN ('unpaid', 'partial')
        AND i.is_void = 0
        GROUP BY c.id
        HAVING current + days31_60 + days61_90 + over90 > 0
        ORDER BY current + days31_60 + days61_90 + over90 DESC
      `).all(date, date, date, date);

      const entries: AgedEntry[] = (customers as any[]).map(c => ({
        id: c.id,
        name: c.name,
        current: Number(c.current || 0),
        days31_60: Number(c.days31_60 || 0),
        days61_90: Number(c.days61_90 || 0),
        over90: Number(c.over90 || 0),
        total: Number(c.current || 0) + Number(c.days31_60 || 0) + Number(c.days61_90 || 0) + Number(c.over90 || 0),
      }));

      const grandTotal = entries.reduce((s, e) => s + e.total, 0);

      return {
        success: true,
        data: {
          entries,
          totalCurrent: entries.reduce((s, e) => s + e.current, 0),
          total31_60: entries.reduce((s, e) => s + e.days31_60, 0),
          total61_90: entries.reduce((s, e) => s + e.days61_90, 0),
          totalOver90: entries.reduce((s, e) => s + e.over90, 0),
          grandTotal,
          asOfDate: date,
        },
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to generate report: ' + error.message };
    }
  }

  /**
   * Generate aged payables report (money we owe to suppliers)
   */
  getAgedPayables(asOfDate?: string): ApiResponse<AgedReport> {
    try {
      const date = asOfDate || new Date().toISOString().split('T')[0];

      const suppliers = this.db.prepare(`
        SELECT
          c.id, c.name, c.current_balance,
          MAX(COALESCE(i.due_date, i.date)) as last_due_date,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 0 AND 30 THEN i.balance_due ELSE 0 END) as current,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) as days31_60,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) as days61_90,
          SUM(CASE WHEN julianday(?) - julianday(COALESCE(i.due_date, i.date)) > 90 THEN i.balance_due ELSE 0 END) as over90
        FROM contacts c
        JOIN invoices i ON c.id = i.contact_id
        WHERE c.type = 'supplier'
        AND i.payment_status IN ('unpaid', 'partial')
        AND i.is_void = 0
        GROUP BY c.id
        HAVING current + days31_60 + days61_90 + over90 > 0
        ORDER BY current + days31_60 + days61_90 + over90 DESC
      `).all(date, date, date, date);

      const entries: AgedEntry[] = (suppliers as any[]).map(c => ({
        id: c.id,
        name: c.name,
        current: Number(c.current || 0),
        days31_60: Number(c.days31_60 || 0),
        days61_90: Number(c.days61_90 || 0),
        over90: Number(c.over90 || 0),
        total: Number(c.current || 0) + Number(c.days31_60 || 0) + Number(c.days61_90 || 0) + Number(c.over90 || 0),
      }));

      return {
        success: true,
        data: {
          entries,
          totalCurrent: entries.reduce((s, e) => s + e.current, 0),
          total31_60: entries.reduce((s, e) => s + e.days31_60, 0),
          total61_90: entries.reduce((s, e) => s + e.days61_90, 0),
          totalOver90: entries.reduce((s, e) => s + e.over90, 0),
          grandTotal: entries.reduce((s, e) => s + e.total, 0),
          asOfDate: date,
        },
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to generate report: ' + error.message };
    }
  }
}
