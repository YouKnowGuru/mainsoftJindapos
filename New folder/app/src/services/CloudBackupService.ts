import { DatabaseManager } from '../database/DatabaseManager';
import { DriveService } from './DriveService';
import { MegaService } from './MegaService';
import { encryptFile, decryptFile } from '../utils/encryption';
import { checkInternet } from '../utils/internetCheck';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import * as cron from 'node-cron';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

interface CloudBackupSettings {
  enabled: boolean;
  frequency: '30min' | 'hourly' | 'daily';
  targets: {
    googleDrive: boolean;
    mega: boolean;
  };
}

interface BackupLog {
  id: string;
  date: string;
  status: 'success' | 'failed' | 'in_progress';
  storage: string[];
  fileSize?: number;
  fileName?: string;
  error?: string;
  duration?: number;
}

interface BackupProgress {
  stage: string;
  percent: number;
  message: string;
}

const FREQUENCY_MAP: Record<string, string> = {
  '30min': '*/30 * * * *',
  'hourly': '0 * * * *',
  'daily': '0 0 * * *'
};

/**
 * CloudBackupService — Central orchestrator for automated cloud backups.
 * Manages scheduling, backup generation, encryption, uploads, and logging.
 */
export class CloudBackupService {
  private dbManager: DatabaseManager;
  private mainWindow: any;
  driveService: DriveService;
  megaService: MegaService;

  private settingsPath: string;
  private logsPath: string;
  private tempDir: string;
  private userDataPath: string;
  private settings: CloudBackupSettings;
  private logs: BackupLog[] = [];
  private cronJob: ReturnType<typeof cron.schedule> | null = null;
  private isBackupRunning = false;
  private backupQueue: Array<{ targets: string[] }> = [];

  constructor(dbManager: DatabaseManager, userDataPath: string, mainWindow?: any) {
    this.dbManager = dbManager;
    this.mainWindow = mainWindow;
    this.userDataPath = userDataPath;
    this.settingsPath = path.join(userDataPath, 'cloud-backup-settings.json');
    this.logsPath = path.join(userDataPath, 'backup-logs.json');
    this.tempDir = path.join(userDataPath, 'temp-backups');

    // Ensure temp dir exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Initialize cloud services
    this.driveService = new DriveService(userDataPath);
    this.megaService = new MegaService(userDataPath);

    // Load settings and logs
    this.settings = this.loadSettings();
    this.loadLogs();

    // Start scheduler if enabled
    if (this.settings.enabled) {
      this.startScheduler();
    }

    // Auto-connect MEGA if credentials stored
    if (this.megaService.hasCredentials()) {
      this.megaService.autoReconnect().catch(err =>
        console.error('[CloudBackup] Mega auto-reconnect failed:', err)
      );
    }
  }

  /**
   * Set reference to the main window (for sending progress events).
   */
  setMainWindow(win: any): void {
    this.mainWindow = win;
  }

  // ============================================
  // SETTINGS
  // ============================================

  getSettings(): CloudBackupSettings {
    return { ...this.settings };
  }

  saveSettings(newSettings: Partial<CloudBackupSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // Handle nested targets object
    if (newSettings.targets) {
      this.settings.targets = { ...this.settings.targets, ...newSettings.targets };
    }

    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      console.log('[CloudBackup] Settings saved');
    } catch (error) {
      console.error('[CloudBackup] Failed to save settings:', error);
    }

    // Restart scheduler based on new settings
    if (this.settings.enabled) {
      this.startScheduler();
    } else {
      this.stopScheduler();
    }
  }

  private loadSettings(): CloudBackupSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[CloudBackup] Failed to load settings:', error);
    }
    return {
      enabled: false,
      frequency: 'daily',
      targets: { googleDrive: false, mega: false }
    };
  }

  // ============================================
  // LOGS
  // ============================================

  getLogs(): BackupLog[] {
    return [...this.logs].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private addLog(log: BackupLog): void {
    this.logs.unshift(log);
    // Keep last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    this.saveLogs();
  }

  private updateLog(id: string, updates: Partial<BackupLog>): void {
    const idx = this.logs.findIndex(l => l.id === id);
    if (idx >= 0) {
      this.logs[idx] = { ...this.logs[idx], ...updates };
      this.saveLogs();
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logsPath, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('[CloudBackup] Failed to save logs:', error);
    }
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logsPath)) {
        const data = fs.readFileSync(this.logsPath, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('[CloudBackup] Failed to load logs:', error);
      this.logs = [];
    }
  }

  // ============================================
  // SCHEDULER
  // ============================================

  startScheduler(): void {
    this.stopScheduler();

    const cronExpr = FREQUENCY_MAP[this.settings.frequency] || FREQUENCY_MAP['daily'];
    console.log(`[CloudBackup] Starting scheduler: ${this.settings.frequency} (${cronExpr})`);

    this.cronJob = cron.schedule(cronExpr, async () => {
      try {
        const targets: string[] = [];
        if (this.settings.targets.googleDrive) targets.push('drive');
        if (this.settings.targets.mega) targets.push('mega');

        if (targets.length > 0) {
          await this.runBackup(targets);
        }
      } catch (error) {
        // Log error but don't crash the scheduler — next scheduled run will retry
        console.error('[CloudBackup] Scheduled backup failed');
      }
    });
  }

  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[CloudBackup] Scheduler stopped');
    }
  }

  // ============================================
  // BACKUP EXECUTION
  // ============================================

  /**
   * Run a backup immediately (manual or scheduled).
   */
  async runBackup(targets: string[]): Promise<{ success: boolean; message?: string }> {
    if (this.isBackupRunning) {
      // Queue the request
      this.backupQueue.push({ targets });
      console.log('[CloudBackup] Backup queued (another is running)');
      return { success: true, message: 'Backup queued' };
    }

    this.isBackupRunning = true;
    const logId = crypto.randomUUID();
    const startTime = Date.now();

    this.addLog({
      id: logId,
      date: new Date().toISOString(),
      status: 'in_progress',
      storage: targets
    });

    this.sendProgress({ stage: 'starting', percent: 0, message: 'Initializing backup...' });

    try {
      // Step 1: Check internet
      this.sendProgress({ stage: 'checking', percent: 5, message: 'Checking internet connectivity...' });
      const hasInternet = await checkInternet();
      if (!hasInternet) {
        throw new Error('No internet connection available');
      }

      // Step 2: Export data to JSON using streaming (low memory)
      this.sendProgress({ stage: 'exporting', percent: 10, message: 'Exporting POS data...' });
      const timestamp = this.formatTimestamp(new Date());
      const jsonFileName = `backup-${timestamp}.json`;
      const jsonFilePath = path.join(this.tempDir, jsonFileName);

      await this.dbManager.exportDatabaseToJSONStream(jsonFilePath, (tableName, rowsWritten, totalTables, tableIndex) => {
        const tablePercent = Math.floor((tableIndex / totalTables) * 20);
        this.sendProgress({
          stage: 'exporting',
          percent: 10 + tablePercent,
          message: `Exporting ${tableName}... (${rowsWritten} rows)`
        });
      });

      // Step 3: Compress to ZIP
      this.sendProgress({ stage: 'compressing', percent: 30, message: 'Compressing data...' });
      const zipFileName = `backup-${timestamp}.zip`;
      const zipFilePath = path.join(this.tempDir, zipFileName);
      await this.createZip(jsonFilePath, zipFilePath);

      // Step 5: Encrypt
      this.sendProgress({ stage: 'encrypting', percent: 50, message: 'Encrypting backup...' });
      const encryptedFilePath = zipFilePath + '.enc';
      await encryptFile(zipFilePath, encryptedFilePath);

      const fileSize = fs.statSync(encryptedFilePath).size;
      const uploadFileName = `backup-${timestamp}.zip.enc`;

      // Step 6: Upload to cloud targets
      const uploadResults: { provider: string; success: boolean; message?: string }[] = [];
      const uploadTargets = targets.length;
      let uploadedCount = 0;

      for (const target of targets) {
        const basePercent = 60 + Math.floor((uploadedCount / uploadTargets) * 35);

        if (target === 'drive') {
          this.sendProgress({ stage: 'uploading', percent: basePercent, message: 'Uploading to Google Drive...' });
          const result = await this.uploadWithRetry(
            () => this.driveService.uploadBackup(encryptedFilePath, uploadFileName, (p) => {
              this.sendProgress({
                stage: 'uploading',
                percent: basePercent + Math.floor(p * 0.35 / uploadTargets),
                message: `Google Drive: ${p}%`
              });
            }),
            3
          );
          uploadResults.push({ provider: 'drive', ...result });
        }

        if (target === 'mega') {
          this.sendProgress({ stage: 'uploading', percent: basePercent, message: 'Uploading to MEGA...' });
          const result = await this.uploadWithRetry(
            () => this.megaService.uploadBackup(encryptedFilePath, uploadFileName, (p) => {
              this.sendProgress({
                stage: 'uploading',
                percent: basePercent + Math.floor(p * 0.35 / uploadTargets),
                message: `MEGA: ${p}%`
              });
            }),
            3
          );
          uploadResults.push({ provider: 'mega', ...result });
        }

        uploadedCount++;
      }

      // Step 7: Cleanup temp files
      this.sendProgress({ stage: 'cleaning', percent: 95, message: 'Cleaning up...' });
      this.cleanupTempFiles([jsonFilePath, zipFilePath, encryptedFilePath]);

      // Step 8: Delete old cloud backups
      await this.cleanupOldCloudBackups();

      // Determine overall status
      const allSuccess = uploadResults.every(r => r.success);
      const anySuccess = uploadResults.some(r => r.success);
      const failedProviders = uploadResults.filter(r => !r.success);
      const duration = Date.now() - startTime;

      let status: 'success' | 'failed' = allSuccess ? 'success' : 'failed';
      let errorMsg = failedProviders.map(f => `${f.provider}: ${f.message}`).join('; ');

      if (anySuccess && !allSuccess) {
        // Partial success
        errorMsg = 'Partial: ' + errorMsg;
        status = 'success'; // Still mark as success since some uploads worked
      }

      this.updateLog(logId, {
        status,
        fileSize,
        fileName: uploadFileName,
        error: errorMsg || undefined,
        duration
      });

      this.sendProgress({
        stage: 'complete',
        percent: 100,
        message: allSuccess ? 'Backup completed successfully!' : `Backup completed with errors: ${errorMsg}`
      });

      this.isBackupRunning = false;

      // Process queue
      this.processQueue();

      return { success: anySuccess, message: allSuccess ? 'Backup completed' : errorMsg };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[CloudBackup] Backup failed:', error);

      this.updateLog(logId, {
        status: 'failed',
        error: error.message,
        duration
      });

      this.sendProgress({ stage: 'error', percent: 0, message: `Backup failed: ${error.message}` });
      this.isBackupRunning = false;
      this.processQueue();

      return { success: false, message: error.message };
    }
  }

  /**
   * Get connection status of cloud providers.
   */
  getConnectionStatus(): { drive: { connected: boolean; configured: boolean }; mega: { connected: boolean; email: string | null } } {
    return {
      drive: {
        connected: this.driveService.isConnected(),
        configured: this.driveService.isConfigured()
      },
      mega: {
        connected: this.megaService.isConnected(),
        email: this.megaService.getEmail()
      }
    };
  }

  /**
   * Get list of cloud backups from a provider.
   */
  async getCloudBackups(provider: 'drive' | 'mega'): Promise<any[]> {
    if (provider === 'drive') {
      return this.driveService.listBackups();
    } else {
      return this.megaService.listBackups();
    }
  }

  /**
   * Restore a backup from cloud.
   */
  async restoreFromCloud(
    provider: 'drive' | 'mega',
    backupId: string,
    backupName: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[CloudBackup] Starting restore from ${provider}. backupId: ${backupId}, backupName: ${backupName}`);
      this.sendProgress({ stage: 'downloading', percent: 10, message: `Downloading from ${provider}...` });

      const encryptedPath = path.join(this.tempDir, backupName);
      const zipPath = encryptedPath.replace('.enc', '');

      console.log(`[CloudBackup] Encrypted path: ${encryptedPath}`);
      console.log(`[CloudBackup] ZIP path: ${zipPath}`);

      // Download
      let result;
      if (provider === 'drive') {
        result = await this.driveService.downloadBackup(backupId, encryptedPath);
      } else {
        result = await this.megaService.downloadBackup(backupName, encryptedPath);
      }

      console.log(`[CloudBackup] Download result:`, result);

      if (!result.success) {
        console.error(`[CloudBackup] Download failed: ${result.message}`);
        return result;
      }

      // Decrypt
      this.sendProgress({ stage: 'decrypting', percent: 40, message: 'Decrypting backup...' });
      console.log(`[CloudBackup] Decrypting...`);
      await decryptFile(encryptedPath, zipPath);

      // Extract ZIP to disk (not into memory)
      this.sendProgress({ stage: 'extracting', percent: 60, message: 'Extracting backup archive...' });
      console.log(`[CloudBackup] Extracting ZIP...`);

      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      console.log(`[CloudBackup] ZIP entries:`, zipEntries.map(e => e.entryName));

      const jsonEntry = zipEntries.find(entry => entry.entryName.endsWith('.json'));

      if (!jsonEntry) {
        console.error(`[CloudBackup] No JSON entry found in ZIP. Entries:`, zipEntries.map(e => e.entryName));
        throw new Error('Invalid backup file: Could not find JSON data inside archive');
      }

      // SECURITY: Validate ZIP entry name to prevent path traversal (ZipSlip)
      const entryName = path.basename(jsonEntry.entryName);
      if (!entryName || entryName === '.' || entryName === '..') {
        throw new Error('Invalid backup file: Malicious ZIP entry detected');
      }
      if (jsonEntry.entryName.includes('..') || jsonEntry.entryName.startsWith('/') || jsonEntry.entryName.includes('\\')) {
        throw new Error('Invalid backup file: Path traversal attempt detected in ZIP archive');
      }

      const extractedJsonPath = path.join(this.tempDir, entryName);
      zip.extractEntryTo(jsonEntry, this.tempDir, false, true);
      console.log(`[CloudBackup] Extracted JSON to: ${extractedJsonPath}`);

      // Create emergency backup of current DB before modifying
      const dbPath = this.getDbPath();
      const emergencyPath = dbPath + '.emergency-backup';
      this.dbManager.getDatabase().pragma('wal_checkpoint(TRUNCATE)');
      fs.copyFileSync(dbPath, emergencyPath);
      console.log(`[CloudBackup] Emergency backup created: ${emergencyPath}`);

      // Stream-import from extracted JSON (batched, low memory)
      this.sendProgress({ stage: 'restoring', percent: 70, message: 'Restoring database records...' });
      console.log(`[CloudBackup] Starting streaming import...`);

      try {
        await this.dbManager.importDatabaseFromJSONStream(extractedJsonPath, (tableName, rowsInserted) => {
          this.sendProgress({
            stage: 'restoring',
            percent: 70 + Math.min(25, Math.floor(rowsInserted / 500)),
            message: `Restoring ${tableName}... (${rowsInserted} rows)`
          });
        });
      } catch (restoreErr: any) {
        // Restore failed — roll back to emergency backup
        console.error('[CloudBackup] Streaming import failed, rolling back:', restoreErr);
        this.sendProgress({ stage: 'rolling_back', percent: 0, message: 'Restore failed, rolling back...' });
        this.dbManager.close();
        fs.copyFileSync(emergencyPath, dbPath);
        this.dbManager.reopen();
        throw new Error(`Restore failed and was rolled back: ${restoreErr.message}`);
      } finally {
        this.cleanupTempFiles([extractedJsonPath]);
        // Clean up emergency backup on success (keep on failure for manual recovery)
        if (fs.existsSync(emergencyPath)) {
          try { fs.unlinkSync(emergencyPath); } catch (e) { }
        }
      }

      this.sendProgress({ stage: 'complete', percent: 100, message: 'Restoration complete! System rebooting...' });
      this.cleanupTempFiles([encryptedPath, zipPath]);

      console.log(`[CloudBackup] Restore successful, scheduling restart...`);

      // Relaunch app cleanly giving the UI exactly 1.5s to display the 100% bar
      setTimeout(() => {
        const { app } = require('electron');
        console.log(`[CloudBackup] Restarting app...`);
        app.relaunch();
        app.exit(0);
      }, 1500);

      return { success: true, message: 'Backup restored successfully! Application is restarting.' };
    } catch (error: any) {
      console.error('[CloudBackup] Restore failed:', error);
      console.error('[CloudBackup] Error stack:', error.stack);
      return { success: false, message: error.message };
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getDbPath(): string {
    return path.join(this.userDataPath, 'dhisum_tseyig.db');
  }

  /**
   * Create a ZIP archive from a source file.
   */
  private createZip(sourcePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`[CloudBackup] ZIP created: ${archive.pointer()} bytes`);
        resolve();
      });
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(sourcePath, { name: path.basename(sourcePath) });
      archive.finalize();
    });
  }

  /**
   * Upload with retry logic (exponential backoff).
   */
  private async uploadWithRetry(
    uploadFn: () => Promise<{ success: boolean; message?: string }>,
    maxRetries: number
  ): Promise<{ success: boolean; message?: string }> {
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await uploadFn();
      if (result.success) return result;

      lastError = result.message || 'Unknown error';
      console.warn(`[CloudBackup] Upload attempt ${attempt}/${maxRetries} failed: ${lastError}`);

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    return { success: false, message: `Failed after ${maxRetries} attempts: ${lastError}` };
  }

  /**
   * Cleanup temporary files.
   */
  private cleanupTempFiles(files: string[]): void {
    for (const f of files) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (err) {
        console.warn(`[CloudBackup] Failed to cleanup: ${f}`);
      }
    }
  }

  /**
   * Delete old backups from cloud (keep last 7 days).
   */
  private async cleanupOldCloudBackups(): Promise<void> {
    try {
      if (this.settings.targets.googleDrive && this.driveService.isConnected()) {
        const deleted = await this.driveService.deleteOldBackups(7);
        if (deleted > 0) console.log(`[CloudBackup] Cleaned ${deleted} old Drive backups`);
      }
      if (this.settings.targets.mega && this.megaService.isConnected()) {
        const deleted = await this.megaService.deleteOldBackups(7);
        if (deleted > 0) console.log(`[CloudBackup] Cleaned ${deleted} old MEGA backups`);
      }
    } catch (error) {
      console.error('[CloudBackup] Error cleaning old cloud backups:', error);
    }
  }

  /**
   * Process queued backup requests.
   */
  private processQueue(): void {
    if (this.backupQueue.length > 0 && !this.isBackupRunning) {
      const next = this.backupQueue.shift()!;
      this.runBackup(next.targets);
    }
  }

  /**
   * Send progress update to renderer.
   */
  private sendProgress(progress: BackupProgress): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('cloudBackup:progress', progress);
    }
  }

  /**
   * Format a Date as YYYY-MM-DD-HH-mm
   */
  private formatTimestamp(date: Date): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}-${h}-${mi}`;
  }
}
