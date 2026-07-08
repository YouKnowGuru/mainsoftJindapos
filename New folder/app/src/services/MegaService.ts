import { Storage } from 'megajs';
import fs from 'fs';
import path from 'path';
import { encryptBuffer, decryptBuffer } from '../utils/encryption';

interface MegaCredentials {
  email: string;
  password: string;
}

/**
 * MegaService — MEGA cloud storage integration for backups.
 * Uses email/password authentication.
 */
export class MegaService {
  private credentialsPath: string;
  private backupFolderName = 'POS Backups';
  private storage: Storage | null = null;
  private credentials: MegaCredentials | null = null;
  private _connected = false;

  constructor(userDataPath: string) {
    this.credentialsPath = path.join(userDataPath, '.mega-creds.enc');
    this.loadCredentials();
  }

  /**
   * Check if MEGA is connected
   */
  isConnected(): boolean {
    return this._connected && this.storage !== null;
  }

  /**
   * Check if credentials are stored
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Connect to MEGA with email and password.
   * Stores credentials encrypted on disk.
   */
  async connect(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      this.storage = new Storage({
        email,
        password,
        autologin: true,
        autoload: true
      } as any);

      await new Promise<void>((resolve, reject) => {
        (this.storage as any).once('ready', () => resolve());
        (this.storage as any).once('error', (err: any) => reject(err));

        // Timeout after 30 seconds
        setTimeout(() => reject(new Error('MEGA login timed out')), 30000);
      });

      this.credentials = { email, password };
      this.saveCredentials();
      this._connected = true;

      console.log(`[MegaService] Connected as ${email}`);
      return { success: true };
    } catch (error: any) {
      console.error('[MegaService] Connection failed:', error);
      this.storage = null;
      this._connected = false;
      return { success: false, message: error.message || 'MEGA login failed' };
    }
  }

  /**
   * Auto-reconnect using stored credentials.
   */
  async autoReconnect(): Promise<boolean> {
    if (!this.credentials) return false;
    const result = await this.connect(this.credentials.email, this.credentials.password);
    return result.success;
  }

  /**
   * Disconnect from MEGA and remove stored credentials.
   */
  disconnect(): void {
    try {
      if (this.storage) {
        this.storage.close();
        this.storage = null;
      }
      this.credentials = null;
      this._connected = false;

      if (fs.existsSync(this.credentialsPath)) {
        fs.unlinkSync(this.credentialsPath);
      }
      console.log('[MegaService] Disconnected');
    } catch (error) {
      console.error('[MegaService] Error disconnecting:', error);
    }
  }

  /**
   * Upload a backup file to MEGA.
   */
  async uploadBackup(
    filePath: string,
    fileName: string,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!this.isConnected()) {
        const reconnected = await this.autoReconnect();
        if (!reconnected) {
          return { success: false, message: 'MEGA is not connected' };
        }
      }

      console.log(`[MegaService] Starting upload of ${fileName} (${fs.statSync(filePath).size} bytes)`);

      const folder = await this.getOrCreateFolder();

      const fileStream = fs.createReadStream(filePath);
      const fileSize = fs.statSync(filePath).size;
      let uploadedBytes = 0;

      const uploadStream = folder.upload({
        name: fileName,
        size: fileSize
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          fileStream.destroy();
          resolve({ success: false, message: 'MEGA upload timed out' });
        }, 300000); // 5 minutes

        if (onProgress) {
          fileStream.on('data', (chunk) => {
            uploadedBytes += chunk.length;
            const percent = Math.round((uploadedBytes / fileSize) * 100);
            onProgress(percent);
          });
        }

        fileStream.on('error', (err: any) => {
          console.error('[MegaService] Read stream error:', err);
          clearTimeout(timeout);
          resolve({ success: false, message: `Read error: ${err.message}` });
        });

        uploadStream.on('error', (err: any) => {
          console.error('[MegaService] Upload stream error:', err);
          clearTimeout(timeout);
          resolve({ success: false, message: `Upload error: ${err.message}` });
        });

        uploadStream.on('complete', () => {
          console.log(`[MegaService] Upload complete: ${fileName}`);
          clearTimeout(timeout);
          resolve({ success: true });
        });

        fileStream.pipe(uploadStream);
      });
    } catch (error: any) {
      console.error('[MegaService] Critical upload error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * List backup files in the POS Backups folder.
   */
  async listBackups(): Promise<Array<{ id: string; name: string; size: number; createdAt: string }>> {
    try {
      if (!this.isConnected()) {
        const reconnected = await this.autoReconnect();
        if (!reconnected) {
          console.log('[MegaService] Not connected and auto-reconnect failed');
          return [];
        }
      }

      const folder = await this.getOrCreateFolder();

      // MEGA's children array may trigger lazy fetch — wrap in try/catch per child
      let children: any[] = [];
      try {
        children = folder.children || [];
      } catch (childErr) {
        console.warn('[MegaService] Failed to read folder children (lazy fetch):', childErr);
        return [];
      }

      console.log(`[MegaService] listBackups found ${children.length} total raw children in POS Backups folder`);

      const backups: Array<{ id: string; name: string; size: number; createdAt: string }> = [];
      for (let idx = 0; idx < children.length; idx++) {
        try {
          const f = children[idx];
          // Access properties defensively — may trigger lazy fetch
          const name = f?.name;
          const isDir = f?.directory;
          const size = f?.size ?? 0;
          const timestamp = f?.timestamp;

          console.log(`[MegaService] Child ${idx}: name=${name}, directory=${isDir}, size=${size}, timestamp=${timestamp}`);

          const isBackupFile = name && !isDir && (name.endsWith('.zip.enc') || name.endsWith('.db'));
          if (!isBackupFile) {
            console.log(`[MegaService] Skipping non-backup file: ${name}`);
            continue;
          }

          backups.push({
            id: f.nodeId || f.downloadId || name,
            name: name,
            size: size,
            createdAt: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString()
          });
        } catch (itemErr) {
          console.warn(`[MegaService] Failed to read child ${idx}:`, itemErr);
          // Skip this child and continue
        }
      }

      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[MegaService] listBackups mapped to ${backups.length} valid backups:`, backups.map((b: any) => b.name));
      return backups;
    } catch (error) {
      console.error('[MegaService] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Download a backup file from MEGA.
   */
  async downloadBackup(fileName: string, destinationPath: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (!this.isConnected()) {
        const reconnected = await this.autoReconnect();
        if (!reconnected) {
          return { success: false, message: 'MEGA is not connected. Please reconfigure your MEGA credentials.' };
        }
      }

      const folder = await this.getOrCreateFolder();
      const children = folder.children || [];
      const file = children.find((f: any) => f.name === fileName);

      if (!file) {
        return { success: false, message: `File not found: ${fileName}` };
      }

      console.log(`[MegaService] Downloading file: ${fileName}`);
      const data = await file.downloadBuffer();
      console.log(`[MegaService] Downloaded ${data.length} bytes, writing to: ${destinationPath}`);
      fs.writeFileSync(destinationPath, data);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`[MegaService] Download failed: ${errorMessage}`);

      // Provide more specific error messages
      if (errorMessage.includes('Bad Decode') || errorMessage.includes('bad decode')) {
        return {
          success: false,
          message: 'Bad Decode Error: The encryption key does not match. This file was likely uploaded with different MEGA credentials. Please verify your email/password in Cloud Backup settings.'
        };
      }

      if (errorMessage.includes('Not Found') || errorMessage.includes('ENOENT')) {
        return { success: false, message: 'File not found on MEGA. It may have been deleted.' };
      }

      return { success: false, message: `MEGA download failed: ${errorMessage}` };
    }
  }

  /**
   * Delete old backups from MEGA.
   */
  async deleteOldBackups(maxAgeDays: number = 7): Promise<number> {
    try {
      if (!this.isConnected()) return 0;

      const folder = await this.getOrCreateFolder();
      const children = folder.children || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - maxAgeDays);

      let deleted = 0;
      for (const file of children) {
        if (file.directory) continue;
        const fileDate = file.timestamp ? new Date(file.timestamp * 1000) : new Date();
        if (fileDate < cutoff) {
          try {
            await file.delete(true);
            deleted++;
            console.log(`[MegaService] Deleted old backup: ${file.name}`);
          } catch (err) {
            console.warn(`[MegaService] Failed to delete ${file.name}:`, err);
          }
        }
      }
      return deleted;
    } catch (error) {
      console.error('[MegaService] Error cleaning old backups:', error);
      return 0;
    }
  }

  /**
   * Get the connected MEGA email.
   */
  getEmail(): string | null {
    return this.credentials?.email || null;
  }

  // ========== Private helpers ==========

  private async getOrCreateFolder(): Promise<any> {
    if (!this.storage) throw new Error('MEGA not connected');

    // Ensure the file tree is loaded
    try {
      await this.storage.reload();
    } catch (reloadErr) {
      console.warn('[MegaService] reload() failed, attempting to continue:', reloadErr);
      // Some MEGA implementations load lazily — try to proceed
    }

    const root = this.storage.root;
    if (!root) {
      throw new Error('MEGA root not available');
    }

    // Access children defensively — may trigger lazy fetch
    let children: any[] = [];
    try {
      children = root.children || [];
    } catch (childErr) {
      console.warn('[MegaService] Failed to read root children:', childErr);
      children = [];
    }

    let existing;
    try {
      existing = children.find((f: any) => f?.name === this.backupFolderName && f?.directory);
    } catch (findErr) {
      console.warn('[MegaService] Error finding existing folder:', findErr);
      existing = undefined;
    }

    if (existing) return existing;

    // Create folder
    try {
      const newFolder = await root.mkdir(this.backupFolderName);
      console.log(`[MegaService] Created backup folder`);
      return newFolder;
    } catch (mkdirErr: any) {
      // Folder may already exist but wasn't found due to lazy loading
      if (mkdirErr?.message?.includes('already exists') || mkdirErr?.message?.includes('EXIST')) {
        console.log('[MegaService] Folder already exists, returning root');
        return root;
      }
      throw mkdirErr;
    }
  }

  private saveCredentials(): void {
    try {
      if (!this.credentials) return;
      const data = Buffer.from(JSON.stringify(this.credentials), 'utf-8');
      const encrypted = encryptBuffer(data);
      fs.writeFileSync(this.credentialsPath, encrypted);
    } catch (error) {
      console.error('[MegaService] Failed to save credentials:', error);
    }
  }

  private loadCredentials(): void {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        const encrypted = fs.readFileSync(this.credentialsPath);
        const decrypted = decryptBuffer(encrypted);
        this.credentials = JSON.parse(decrypted.toString('utf-8'));
        console.log('[MegaService] Credentials loaded from disk');
      }
    } catch (error) {
      console.error('[MegaService] Failed to load credentials:', error);
      this.credentials = null;
    }
  }
}
