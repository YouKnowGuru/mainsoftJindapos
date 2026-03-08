import { DatabaseManager } from '../database/DatabaseManager';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import type { ApiResponse } from '../types';

/**
 * BackupService - Handles database backup and restore operations
 */
export class BackupService {
  private dbPath: string;
  private backupDir: string;

  constructor(_dbManager: DatabaseManager, userDataPath: string) {
    this.dbPath = path.join(userDataPath, 'dhisum_tseyig.db');
    this.backupDir = path.join(userDataPath, 'backups');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a manual backup to a specific path
   */
  createBackup(destinationPath: string): ApiResponse<{ path: string }> {
    try {
      // Copy database file
      fs.copyFileSync(this.dbPath, destinationPath);

      console.log(`Backup created: ${destinationPath}`);

      return {
        success: true,
        data: { path: destinationPath },
        message: 'Backup created successfully'
      };
    } catch (error: any) {
      console.error('Create backup error:', error);
      return {
        success: false,
        message: `Backup failed: ${error.message}`
      };
    }
  }

  /**
   * Restore database from a backup file
   */
  restoreBackup(backupPath: string): ApiResponse {
    try {
      // Verify backup file exists
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: 'Backup file not found'
        };
      }

      // Create emergency backup of current database
      const emergencyBackup = path.join(this.backupDir, `emergency_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.db`);
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, emergencyBackup);
      }

      // Restore backup
      fs.copyFileSync(backupPath, this.dbPath);

      return {
        success: true,
        message: 'Database restored successfully. Please restart the application.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`
      };
    }
  }

  /**
   * Create daily automatic backup
   */
  createDailyBackup(): ApiResponse<{ path?: string }> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const backupFileName = `daily_backup_${today}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Check if today's backup already exists
      if (fs.existsSync(backupPath)) {
        return {
          success: true,
          message: 'Daily backup already exists'
        };
      }

      // Clean up old backups (keep last 30 days)
      this.cleanupOldBackups();

      // Create backup
      return this.createBackup(backupPath);
    } catch (error: any) {
      return {
        success: false,
        message: `Daily backup failed: ${error.message}`
      };
    }
  }

  /**
   * Get automatic backup status
   */
  getAutoBackupStatus(): ApiResponse<{
    enabled: boolean;
    lastBackup?: string;
    nextBackup?: string;
    backupCount: number;
    totalSize: number;
  }> {
    try {
      const backups = this.listBackups();
      const lastBackup = backups.length > 0 ? backups[0].created : undefined;

      // Calculate next backup time (default to 11 PM)
      const next = new Date();
      next.setHours(23, 0, 0, 0);
      if (next < new Date()) {
        next.setDate(next.getDate() + 1);
      }

      // Calculate total size
      const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

      return {
        success: true,
        data: {
          enabled: true,
          lastBackup,
          nextBackup: next.toISOString(),
          backupCount: backups.length,
          totalSize
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to get backup status: ' + error.message
      };
    }
  }

  /**
   * List all available backups
   */
  listBackups(): Array<{
    name: string;
    path: string;
    created: string;
    size: number;
  }> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            created: stats.birthtime.toISOString(),
            size: stats.size
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return backups;
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  /**
   * Delete a backup file
   */
  deleteBackup(backupPath: string): ApiResponse {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: 'Backup file not found'
        };
      }

      fs.unlinkSync(backupPath);

      return {
        success: true,
        message: 'Backup deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Delete failed: ${error.message}`
      };
    }
  }

  /**
   * Clean up old backups (keep last 30 days)
   */
  private cleanupOldBackups(): void {
    try {
      const backups = this.listBackups();
      const maxBackups = 30;

      if (backups.length > maxBackups) {
        const oldBackups = backups.slice(maxBackups);
        for (const backup of oldBackups) {
          try {
            fs.unlinkSync(backup.path);
            console.log(`Deleted old backup: ${backup.name}`);
          } catch (error) {
            console.warn(`Failed to delete backup ${backup.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Backup cleanup error:', error);
    }
  }
}
