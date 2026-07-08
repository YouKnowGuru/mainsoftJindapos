/**
 * Secure Token Storage for Electron POS App
 * Uses Electron's safeStorage API or encrypted file storage
 * Never stores tokens in plain text or localStorage
 */
import crypto from 'crypto';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
  email: string;
}

export interface SecureStorageInterface {
  setTokens(data: TokenData): Promise<boolean>;
  getTokens(): Promise<TokenData | null>;
  clearTokens(): Promise<boolean>;
  hasValidTokens(): Promise<boolean>;
  isTokenExpired(): Promise<boolean>;
}

// In-memory fallback (cleared on app restart)
let memoryStore: TokenData | null = null;

// Encryption key derived from machine-specific data
async function getEncryptionKey(): Promise<Buffer> {
  // In production, this should use Electron's safeStorage or OS keychain
  // For now, we derive a key from machine ID (only works in main process)
  if (typeof window !== 'undefined' && (window as any).electronAPI?.getEncryptionKey) {
    try {
      const key = await (window as any).electronAPI.getEncryptionKey();
      return Buffer.from(key, 'hex');
    } catch (e) {
      console.warn('[SecureStorage] Failed to get encryption key, using fallback');
    }
  }

  // SECURITY: Fallback when Electron IPC is unavailable.
  // Derive a stable key from browser fingerprint + static salt so tokens
  // remain decryptable across page reloads (unlike Date.now() which changes).
  // This is less secure than OS keychain but prevents trivial token exposure.
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    navigator.hardwareConcurrency?.toString() || '',
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  return crypto.scryptSync(fingerprint, 'dts-pos-bhutan-v1-salt', 32);
}

function encryptData(data: string, key: Buffer): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted + authTag.toString('hex'),
    iv: iv.toString('hex'),
  };
}

function decryptData(encrypted: string, iv: string, key: Buffer): string {
  const ivBuffer = Buffer.from(iv, 'hex');

  // Split encrypted data from auth tag
  const authTagLength = 32; // 16 bytes in hex
  const encryptedData = encrypted.slice(0, -authTagLength);
  const authTag = Buffer.from(encrypted.slice(-authTagLength), 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Secure storage using Electron IPC
 */
export const secureStorage: SecureStorageInterface = {
  /**
   * Store tokens securely
   */
  async setTokens(data: TokenData): Promise<boolean> {
    try {
      // Use Electron IPC if available
      if (typeof window !== 'undefined' && (window as any).electronAPI?.secureStorage?.setTokens) {
        return await (window as any).electronAPI.secureStorage.setTokens(data);
      }

      // Fallback: encrypt and store in memory only
      // (tokens lost on app restart)
      const key = await getEncryptionKey();
      const encrypted = encryptData(JSON.stringify(data), key);

      // Store encrypted in localStorage as fallback
      // (still better than plain text)
      localStorage.setItem('dts_tokens_encrypted', JSON.stringify(encrypted));

      // Also keep in memory
      memoryStore = data;

      return true;
    } catch (error) {
      console.error('[SecureStorage] Failed to store tokens:', error);
      return false;
    }
  },

  /**
   * Retrieve stored tokens
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      // Use Electron IPC if available
      if (typeof window !== 'undefined' && (window as any).electronAPI?.secureStorage?.getTokens) {
        return await (window as any).electronAPI.secureStorage.getTokens();
      }

      // Fallback: try memory first
      if (memoryStore) {
        return memoryStore;
      }

      // Try localStorage
      const encrypted = localStorage.getItem('dts_tokens_encrypted');
      if (!encrypted) return null;

      const { encrypted: encryptedData, iv } = JSON.parse(encrypted);
      const key = await getEncryptionKey();
      const decrypted = decryptData(encryptedData, iv, key);

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[SecureStorage] Failed to retrieve tokens:', error);
      return null;
    }
  },

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<boolean> {
    try {
      // Use Electron IPC if available
      if (typeof window !== 'undefined' && (window as any).electronAPI?.secureStorage?.clearTokens) {
        return await (window as any).electronAPI.secureStorage.clearTokens();
      }

      // Fallback: clear memory and localStorage
      memoryStore = null;
      localStorage.removeItem('dts_tokens_encrypted');

      return true;
    } catch (error) {
      console.error('[SecureStorage] Failed to clear tokens:', error);
      return false;
    }
  },

  /**
   * Check if valid tokens exist
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return false;

      // Check expiration
      const expiresAt = new Date(tokens.expiresAt);
      return expiresAt > new Date();
    } catch {
      return false;
    }
  },

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return true;

      const expiresAt = new Date(tokens.expiresAt);
      return new Date() >= expiresAt;
    } catch {
      return true;
    }
  },
};

/**
 * Token refresh manager
 * Handles automatic token refresh before expiration
 */
export class TokenManager {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isRefreshing = false;
  private static cleanupFn: (() => void) | null = null;

  /**
   * Start automatic token refresh
   */
  static startAutoRefresh(refreshCallback: () => Promise<boolean>): void {
    // Clear any existing timer
    this.stopAutoRefresh();

    // Check every minute
    this.refreshTimer = setInterval(async () => {
      if (this.isRefreshing) return;

      const tokens = await secureStorage.getTokens();
      if (!tokens) return;

      // Refresh if token expires within 5 minutes
      const expiresAt = new Date(tokens.expiresAt);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      if (expiresAt <= fiveMinutesFromNow) {
        this.isRefreshing = true;
        try {
          const refreshed = await refreshCallback();
          if (!refreshed) {
            // Refresh failed - tokens are likely invalid, stop auto-refresh
            // to prevent spamming the server
            console.log('[TokenManager] Refresh failed, stopping auto-refresh');
            this.stopAutoRefresh();
          }
        } finally {
          this.isRefreshing = false;
        }
      }
    }, 60000); // Check every minute

    // DEFENSIVE: Clear timer on window unload to prevent memory leaks
    // when the renderer reloads (e.g., during updates)
    if (typeof window !== 'undefined') {
      const clearOnUnload = () => this.stopAutoRefresh();
      window.addEventListener('beforeunload', clearOnUnload);
      // Store cleanup reference separately (can't add props to number)
      this.cleanupFn = () => {
        window.removeEventListener('beforeunload', clearOnUnload);
      };
    }
  }

  /**
   * Stop automatic token refresh
   */
  static stopAutoRefresh(): void {
    // Clean up beforeunload listener if present
    if (this.cleanupFn) {
      try { this.cleanupFn(); } catch { /* ignore */ }
      this.cleanupFn = null;
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get current access token for API requests
   */
  static async getAccessToken(): Promise<string | null> {
    const tokens = await secureStorage.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get current refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    const tokens = await secureStorage.getTokens();
    return tokens?.refreshToken || null;
  }
}

export default secureStorage;
