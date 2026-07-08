import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { encryptBuffer, decryptBuffer } from '../utils/encryption';

interface DriveTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

/**
 * DriveService — Google Drive integration for cloud backups.
 * Uses OAuth 2.0 for authentication and the Drive API for file operations.
 */
export class DriveService {
  private tokensPath: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri = 'http://127.0.0.1:38291/oauth2callback';
  private backupFolderName = 'POS Backups';
  private oauth2Client: any;

  constructor(userDataPath: string) {
    this.tokensPath = path.join(userDataPath, '.drive-tokens.enc');
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (this.clientId && this.clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );

      // Load existing tokens if available
      this.loadTokens();
    }
  }

  /**
   * Check if Google Drive is connected (has valid tokens)
   */
  isConnected(): boolean {
    if (!this.oauth2Client) return false;
    const creds = this.oauth2Client.credentials;
    return !!(creds && creds.access_token);
  }

  /**
   * Check if the service is configured (has client ID/secret)
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Start OAuth 2.0 flow. Returns the auth URL to open in a browser window.
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('Google Drive is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });
  }

  /**
   * Complete OAuth flow by exchanging the authorization code for tokens.
   */
  async handleAuthCode(code: string): Promise<{ success: boolean; email?: string; message?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.saveTokens(tokens);

      // Fetch user email
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      return { success: true, email: userInfo.data.email || undefined };
    } catch (error: any) {
      console.error('[DriveService] Failed to exchange auth code:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Disconnect Google Drive (delete stored tokens)
   */
  disconnect(): void {
    try {
      if (fs.existsSync(this.tokensPath)) {
        fs.unlinkSync(this.tokensPath);
      }
      if (this.oauth2Client) {
        this.oauth2Client.credentials = {};
      }
      console.log('[DriveService] Disconnected successfully');
    } catch (error) {
      console.error('[DriveService] Error disconnecting:', error);
    }
  }

  /**
   * Upload a backup file to Google Drive.
   */
  async uploadBackup(
    filePath: string,
    fileName: string,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; fileId?: string; message?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, message: 'Google Drive is not connected' };
      }

      await this.refreshTokenIfNeeded();

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // Get or create the backup folder
      const folderId = await this.getOrCreateFolder(drive);

      // Get file size for progress tracking
      const fileSize = fs.statSync(filePath).size;
      let uploadedBytes = 0;

      // Upload the file with resumable upload for progress tracking
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(filePath)
      };

      // Track upload progress
      if (onProgress) {
        media.body.on('data', (chunk: any) => {
          uploadedBytes += chunk.length;
          const percent = Math.round((uploadedBytes / fileSize) * 100);
          onProgress(percent);
        });
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, size'
      });

      console.log(`[DriveService] Uploaded ${fileName} (ID: ${response.data.id})`);
      return { success: true, fileId: response.data.id || undefined };
    } catch (error: any) {
      console.error('[DriveService] Upload failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * List all backup files in the POS Backups folder.
   */
  async listBackups(): Promise<Array<{ id: string; name: string; size: number; createdAt: string }>> {
    try {
      if (!this.isConnected()) {
        console.log('[DriveService] Not connected');
        return [];
      }
      await this.refreshTokenIfNeeded();

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      const folderId = await this.getOrCreateFolder(drive);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, size, createdTime, mimeType)',
        orderBy: 'createdTime desc',
        pageSize: 100
      });

      const files = response.data.files || [];
      console.log(`[DriveService] listBackups found ${files.length} total raw files in POS Backups folder`);

      // Log all files for debugging
      files.forEach((f: any, idx: number) => {
        console.log(`[DriveService] File ${idx}: name=${f.name}, mimeType=${f.mimeType}, size=${f.size}, createdTime=${f.createdTime}`);
      });

      // Filter for backup files (should be .zip.enc files)
      const backups = files
        .filter((f: any) => {
          const isBackupFile = f.name && (f.name.endsWith('.zip.enc') || f.name.endsWith('.db'));
          if (!isBackupFile) {
            console.log(`[DriveService] Skipping non-backup file: ${f.name}`);
          }
          return isBackupFile;
        })
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          size: parseInt(f.size || '0'),
          createdAt: f.createdTime
        }));

      console.log(`[DriveService] listBackups mapped to ${backups.length} valid backups:`, backups.map((b: any) => b.name));
      return backups;
    } catch (error) {
      console.error('[DriveService] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Download a backup file from Google Drive.
   */
  async downloadBackup(fileId: string, destinationPath: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (!this.isConnected()) {
        return { success: false, message: 'Google Drive is not connected' };
      }
      await this.refreshTokenIfNeeded();

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const dest = fs.createWriteStream(destinationPath);

      return new Promise((resolve, reject) => {
        (response.data as any)
          .pipe(dest)
          .on('finish', () => resolve({ success: true }))
          .on('error', (err: any) => reject({ success: false, message: err.message }));
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete old backups from Google Drive (older than specified days).
   */
  async deleteOldBackups(maxAgeDays: number = 7): Promise<number> {
    try {
      if (!this.isConnected()) return 0;
      await this.refreshTokenIfNeeded();

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      const backups = await this.listBackups();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - maxAgeDays);

      let deleted = 0;
      for (const backup of backups) {
        if (new Date(backup.createdAt) < cutoff) {
          try {
            await drive.files.delete({ fileId: backup.id });
            deleted++;
            console.log(`[DriveService] Deleted old backup: ${backup.name}`);
          } catch (err) {
            console.warn(`[DriveService] Failed to delete ${backup.name}:`, err);
          }
        }
      }
      return deleted;
    } catch (error) {
      console.error('[DriveService] Error cleaning old backups:', error);
      return 0;
    }
  }

  // ========== Private helpers ==========

  private async getOrCreateFolder(drive: any): Promise<string> {
    // Check if folder exists
    const res = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${this.backupFolderName}' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create folder
    const folder = await drive.files.create({
      requestBody: {
        name: this.backupFolderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    console.log(`[DriveService] Created backup folder: ${folder.data.id}`);
    return folder.data.id;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    const creds = this.oauth2Client.credentials;
    if (creds.expiry_date && Date.now() >= creds.expiry_date - 60000) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        this.saveTokens(credentials);
        console.log('[DriveService] Token refreshed');
      } catch (error) {
        console.error('[DriveService] Token refresh failed:', error);
        throw error;
      }
    }
  }

  private saveTokens(tokens: DriveTokens): void {
    try {
      const data = Buffer.from(JSON.stringify(tokens), 'utf-8');
      const encrypted = encryptBuffer(data);
      fs.writeFileSync(this.tokensPath, encrypted);
    } catch (error) {
      console.error('[DriveService] Failed to save tokens:', error);
    }
  }

  private loadTokens(): void {
    try {
      if (fs.existsSync(this.tokensPath)) {
        const encrypted = fs.readFileSync(this.tokensPath);
        const decrypted = decryptBuffer(encrypted);
        const tokens = JSON.parse(decrypted.toString('utf-8'));
        this.oauth2Client.setCredentials(tokens);
        console.log('[DriveService] Tokens loaded from disk');
      }
    } catch (error) {
      console.error('[DriveService] Failed to load tokens:', error);
    }
  }
}
