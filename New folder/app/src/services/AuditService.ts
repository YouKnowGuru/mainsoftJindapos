import Database from 'better-sqlite3';
import { DatabaseManager } from '../database/DatabaseManager';
import type { ApiResponse } from '../types';

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * AuditService
 * Centralized service for tracking application activity and security events.
 */
export class AuditService {
  private db: Database.Database;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  /**
   * Record a new audit log entry
   */
  logAction(params: {
    userId?: number | null;
    action: string;
    entityType?: string;
    entityId?: number | null;
    newValues?: any;
    oldValues?: any;
    ipAddress?: string;
  }): void {
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, old_values, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        params.userId || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.ipAddress || null
      );
    } catch (error) {
      console.error('[AuditService] Failed to log action:', error);
    }
  }

  /**
   * Get all audit logs with user details
   */
  getAllLogs(limit: number = 500): ApiResponse<AuditLog[]> {
    try {
      const logs = this.db.prepare(`
        SELECT l.*, u.username, u.full_name
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT ?
      `).all(limit) as AuditLog[];

      return { success: true, data: logs };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch audit logs: ' + error.message };
    }
  }

  /**
   * Get logs for a specific entity
   */
  getEntityLogs(entityType: string, entityId: number): ApiResponse<AuditLog[]> {
    try {
      const logs = this.db.prepare(`
        SELECT l.*, u.username, u.full_name
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.entity_type = ? AND l.entity_id = ?
        ORDER BY l.created_at DESC
      `).all(entityType, entityId) as AuditLog[];

      return { success: true, data: logs };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch entity logs: ' + error.message };
    }
  }
}
