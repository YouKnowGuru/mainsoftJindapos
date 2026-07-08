import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { Branch, CreateBranchData, ApiResponse } from '../types';

export class BranchService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  create(data: CreateBranchData): ApiResponse {
    try {
      this.db.prepare(`
        INSERT INTO branches (name, code, address, phone, email)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.name, data.code, data.address || null, data.phone || null, data.email || null);
      return { success: true, message: 'Branch created' };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  getAll(activeOnly = true): ApiResponse<Branch[]> {
    try {
      let query = 'SELECT * FROM branches';
      if (activeOnly) query += ' WHERE is_active = 1';
      query += ' ORDER BY name ASC';
      return { success: true, data: this.db.prepare(query).all() as Branch[] };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }

  delete(id: number): ApiResponse {
    try {
      this.db.prepare('UPDATE branches SET is_active = 0 WHERE id = ?').run(id);
      return { success: true, message: 'Branch deactivated' };
    } catch (error: any) {
      return { success: false, message: 'Failed: ' + error.message };
    }
  }
}
