import { BrowserWindow } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BackupService } from '../src/services/BackupService';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  version?: string;
  notes?: string;
  error?: string;
  progress?: number;
}

/**
 * UpdateManager — Handles auto-updates via electron-updater.
 *
 * Flow:
 * 1. App starts → wait 30s → check for updates
 * 2. If update available → download in background
 * 3. When downloaded → notify renderer via IPC
 * 4. User clicks "Restart" → quitAndInstall()
 *
 * Rollback support:
 * - Server can mark version as 'blocked' → skip entirely
 * - Server can mark version as 'rollbacked' → allow downgrade to previous
 * - allowDowngrade: true enables rollback to older versions
 */
export class UpdateManager {
  private state: UpdateState = {
    checking: false,
    available: false,
    downloaded: false,
  };
  private mainWindow: BrowserWindow | null = null;
  private backupService: BackupService | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Configure auto-updater
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = true;
    autoUpdater.allowPrerelease = false;

    // Set feed URL from environment or default
    const feedUrl = process.env.VITE_API_URL || 'https://jindapos.com';
    
    // Use GitHub provider for GitHub Releases (handles redirects properly)
    // Or use generic provider with your own server
    const useGitHub = false; // Set to true if hosting on GitHub Releases
    
    if (useGitHub) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'YouKnowGuru',
        repo: 'dhisum-pos-download',
      });
    } else {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: `${feedUrl}/updates`,
      });
    }

    // Configure request headers for GitHub downloads (follow redirects)
    autoUpdater.requestHeaders = {
      'Accept': 'application/octet-stream,application/vnd.github.v3+json',
    };

    this.setupEventHandlers();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  setBackupService(service: BackupService) {
    this.backupService = service;
  }

  /**
   * Start periodic update checks.
   * First check after 30s, then every 4 hours.
   */
  start() {
    // Initial check after 30 seconds
    setTimeout(() => {
      this.checkForUpdates();
    }, 30000);

    // Periodic check every 4 hours
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * Stop periodic checks.
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Manually trigger an update check.
   */
  async checkForUpdates(): Promise<UpdateState> {
    if (this.state.checking) return this.state;

    try {
      this.state.checking = true;
      this.state.error = undefined;
      this.notifyRenderer('update:checking');

      const result = await autoUpdater.checkForUpdates();

      // If no update info returned, nothing available
      if (!result?.updateInfo) {
        this.state.checking = false;
        return this.state;
      }

      console.log('[UpdateManager] Update info:', {
        version: result.updateInfo.version,
        files: result.updateInfo.files?.length,
        path: result.updateInfo.path,
      });

      // If autoDownload is enabled, the download starts automatically
      // But we need to track it - check if downloadPromise exists
      if (result.downloadPromise) {
        console.log('[UpdateManager] Download started automatically');
        result.downloadPromise
          .then(() => {
            console.log('[UpdateManager] Download completed successfully');
          })
          .catch((err: any) => {
            console.error('[UpdateManager] Download failed:', err.message || err);
            this.state.error = err.message || 'Download failed';
            this.notifyRenderer('update:error', { message: err.message || 'Download failed' });
          });
      }

      this.state.checking = false;
      return this.state;
    } catch (error: any) {
      console.error('[UpdateManager] Check failed:', error);
      this.state.checking = false;
      this.state.error = error.message || 'Update check failed';
      return this.state;
    }
  }

  /**
   * Install the downloaded update and restart.
   */
  async installUpdate(): Promise<{ success: boolean; message?: string }> {
    if (!this.state.downloaded) {
      return { success: false, message: 'No update downloaded' };
    }

    try {
      // Create backup before updating
      if (this.backupService) {
        console.log('[UpdateManager] Creating pre-update backup...');
        try {
          const result = this.backupService.createDailyBackup();
          if (result.success) {
            console.log('[UpdateManager] Pre-update backup created:', result.message);
          } else {
            console.warn('[UpdateManager] Backup warning:', result.message);
          }
        } catch (backupErr) {
          console.warn('[UpdateManager] Backup failed, proceeding anyway:', backupErr);
        }
      }

      // Quit and install
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error: any) {
      console.error('[UpdateManager] Install failed:', error);
      return { success: false, message: error.message || 'Install failed' };
    }
  }

  /**
   * Get current update state.
   */
  getState(): UpdateState {
    return { ...this.state };
  }

  // ========== Private ==========

  private setupEventHandlers() {
    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[UpdateManager] Update available:', info.version);
      this.state.available = true;
      this.state.version = info.version;
      this.state.notes = info.releaseNotes as string || '';
      this.notifyRenderer('update:available', {
        version: info.version,
        notes: info.releaseNotes,
      });
    });

    // Update not available
    autoUpdater.on('update-not-available', () => {
      console.log('[UpdateManager] No update available');
      this.state.available = false;
      this.state.downloaded = false;
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      console.log(`[UpdateManager] Download progress: ${progress.percent.toFixed(1)}% (${(progress.transferred / 1024 / 1024).toFixed(1)} MB / ${(progress.total / 1024 / 1024).toFixed(1)} MB)`);
      this.state.progress = progress.percent;
      this.notifyRenderer('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      });
      // Workaround: electron-updater sometimes doesn't fire update-downloaded
      // after progress reaches 100%. Check if we're at 100% and mark as downloaded.
      if (progress.percent >= 99.9 && !this.state.downloaded) {
        console.log('[UpdateManager] Progress at 100%, checking if download is complete...');
        // Give it a few seconds, then mark as downloaded if event hasn't fired
        setTimeout(() => {
          if (!this.state.downloaded) {
            console.log('[UpdateManager] Marking as downloaded (workaround)');
            this.state.downloaded = true;
            this.notifyRenderer('update:downloaded', {
              version: this.state.version,
            });
          }
        }, 3000);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[UpdateManager] Update downloaded:', info.version);
      this.state.downloaded = true;
      this.state.version = info.version;
      this.notifyRenderer('update:downloaded', {
        version: info.version,
        notes: info.releaseNotes,
      });
    });

    // Error
    autoUpdater.on('error', (error) => {
      console.error('[UpdateManager] Error:', error.message, error.stack);
      this.state.error = error.message;
      this.state.checking = false;
      this.notifyRenderer('update:error', { message: error.message });
    });

    // Download started (electron-updater 6.x+)
    (autoUpdater as any).on('download-started', (info: any) => {
      console.log('[UpdateManager] Download started event:', info);
    });

    // Update cancelled
    (autoUpdater as any).on('update-cancelled', (info: any) => {
      console.log('[UpdateManager] Update cancelled:', info);
    });

    // Before quit for update
    (autoUpdater as any).on('before-quit-for-update', () => {
      console.log('[UpdateManager] Before quit for update');
    });
  }

  private notifyRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

export const updateManager = new UpdateManager();
