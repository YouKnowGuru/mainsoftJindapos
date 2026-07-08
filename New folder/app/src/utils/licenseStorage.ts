/**
 * License Storage Utility
 * Handles reading/writing license.json, trial.json, and .trial-lock files.
 * All files are stored in the Electron userData directory.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface LicenseData {
  licenseKey: string;
  deviceId: string;
  plan: string;
  expiryDate: string;
  maxUsers: number;
  lastVerified: string;
  activationSecret?: string;
}

export interface TrialData {
  trialStartDate: string;
  trialEndDate: string;
  deviceId: string;
}

export interface TrialLockData {
  deviceId: string;
  trialStartDate: string;
}

// ============================================
// File Paths
// ============================================

let userDataPath: string = '';
let encryptionKey: Buffer | null = null;

/**
 * Must be called once from the main process with app.getPath('userData')
 */
export function initStoragePath(dataPath: string): void {
  userDataPath = dataPath;
  // Derive encryption key from userData path (device-specific)
  encryptionKey = deriveKeyFromPath(dataPath);
}

/**
 * Derive a device-specific encryption key from the storage path
 * This ensures the encrypted file can only be decrypted on this device
 */
function deriveKeyFromPath(dataPath: string): Buffer {
  // Use the path itself as a salt, combined with a static pepper
  const pepper = 'Jinda2026BhutanPOS';
  const keyMaterial = crypto.createHash('sha256').update(dataPath + pepper).digest();
  return keyMaterial;
}

function getLicensePath(): string {
  return path.join(userDataPath, 'license.json');
}

function getTrialPath(): string {
  return path.join(userDataPath, 'trial.json');
}

function getTrialLockPath(): string {
  return path.join(userDataPath, '.trial-lock');
}

// ============================================
// Encryption/Decryption
// ============================================

function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    throw new Error('Storage path not initialized. Call initStoragePath first.');
  }
  return encryptionKey;
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0]!, 'hex');
  const encrypted = parts[1]!;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============================================
// License File Operations
// ============================================

export function readLicense(): LicenseData | null {
  try {
    const filePath = getLicensePath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as LicenseData;

    // Validate required fields
    if (!data.licenseKey || !data.deviceId || !data.plan) {
      console.error('[licenseStorage] Invalid license data structure');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[licenseStorage] Error reading license:', error);
    return null;
  }
}

export function writeLicense(data: LicenseData): void {
  try {
    if (!userDataPath) {
      throw new Error('Storage path not initialized. Call initStoragePath first.');
    }

    // Validate data before writing
    if (!data.licenseKey || !data.deviceId || !data.plan) {
      throw new Error('Invalid license data: missing required fields');
    }

    const filePath = getLicensePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[licenseStorage] Error writing license:', error);
    throw error;
  }
}

export function deleteLicense(): void {
  try {
    const filePath = getLicensePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[licenseStorage] Error deleting license:', error);
    throw error;
  }
}

// ============================================
// Trial File Operations
// ============================================

export function readTrial(): TrialData | null {
  try {
    const filePath = getTrialPath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as TrialData;

    // Validate required fields
    if (!data.deviceId || !data.trialStartDate || !data.trialEndDate) {
      console.error('[licenseStorage] Invalid trial data structure');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[licenseStorage] Error reading trial:', error);
    return null;
  }
}

export function writeTrial(data: TrialData): void {
  try {
    if (!userDataPath) {
      throw new Error('Storage path not initialized. Call initStoragePath first.');
    }

    // Validate data before writing
    if (!data.deviceId || !data.trialStartDate || !data.trialEndDate) {
      throw new Error('Invalid trial data: missing required fields');
    }

    const filePath = getTrialPath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[licenseStorage] Error writing trial:', error);
    throw error;
  }
}

// ============================================
// Trial Lock (Encrypted) Operations
// ============================================

export function readTrialLock(): TrialLockData | null {
  try {
    const filePath = getTrialLockPath();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const decrypted = decrypt(raw);
    const data = JSON.parse(decrypted) as TrialLockData;

    // Validate required fields
    if (!data.deviceId || !data.trialStartDate) {
      console.error('[licenseStorage] Invalid trial lock data structure');
      return null;
    }

    return data;
  } catch (error) {
    // Log but return null - corrupted lock files are treated as non-existent
    console.warn('[licenseStorage] Error reading trial lock (may be corrupted or from different device):', error);
    return null;
  }
}

export function writeTrialLock(data: TrialLockData): void {
  try {
    if (!userDataPath) {
      throw new Error('Storage path not initialized. Call initStoragePath first.');
    }

    // Validate data before writing
    if (!data.deviceId || !data.trialStartDate) {
      throw new Error('Invalid trial lock data: missing required fields');
    }

    const filePath = getTrialLockPath();
    const encrypted = encrypt(JSON.stringify(data));
    fs.writeFileSync(filePath, encrypted, 'utf-8');
  } catch (error) {
    console.error('[licenseStorage] Error writing trial lock:', error);
    throw error;
  }
}
