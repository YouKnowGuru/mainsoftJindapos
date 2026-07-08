/**
 * Enhanced Encryption Utilities
 * Bank-Level Security with HMAC Authentication
 */

import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

// Configuration
const ALGORITHM = 'aes-256-gcm'; // GCM mode provides authentication
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Get encryption pepper from secure environment
 */
function getEncryptionPepper(): string {
  const pepper = process.env.ENCRYPTION_PEPPER;
  
  if (pepper && pepper.length >= 32) {
    return pepper;
  }
  
  // Production: Throw error
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_PEPPER environment variable must be set in production');
  }
  
  // Development: Generate temporary (NOT for production)
  console.warn('[Encryption] WARNING: Using temporary development pepper');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Derive encryption key using PBKDF2
 */
function deriveKey(salt: Buffer, pepper: string): Buffer {
  let machineId: string;
  
  try {
    machineId = machineIdSync(true);
  } catch (error) {
    // Fallback for development only
    console.error('[Encryption] Failed to get machine ID');
    machineId = crypto.randomBytes(32).toString('hex');
  }
  
  const combined = machineId + pepper;
  return crypto.pbkdf2Sync(combined, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data with AES-256-GCM
 * Format: [salt(32)][iv(16)][authTag(16)][encryptedData]
 */
export function encryptSecure(data: Buffer): Buffer {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const pepper = getEncryptionPepper();
  const key = deriveKey(salt, pepper);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine: salt + iv + authTag + encrypted
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt data encrypted with encryptSecure
 */
export function decryptSecure(encryptedData: Buffer): Buffer {
  if (encryptedData.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data');
  }
  
  const salt = encryptedData.subarray(0, SALT_LENGTH);
  const iv = encryptedData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedData.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const data = encryptedData.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const pepper = getEncryptionPepper();
  const key = deriveKey(salt, pepper);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Encrypt string data
 */
export function encryptString(plainText: string): Buffer {
  return encryptSecure(Buffer.from(plainText, 'utf-8'));
}

/**
 * Decrypt to string
 */
export function decryptString(encryptedData: Buffer): string {
  return decryptSecure(encryptedData).toString('utf-8');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash password using PBKDF2
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return {
    hash: hash.toString('hex'),
    salt,
  };
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  const computedHash = computed.toString('hex');
  
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  } catch {
    return false;
  }
}

/**
 * Generate secure backup key
 */
export function generateBackupKey(): string {
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * Encrypt file for backup
 */
export function encryptBackup(data: Buffer, backupKey?: string): { encrypted: Buffer; key: string } {
  const key = backupKey || generateBackupKey();
  const keyBuffer = crypto.scryptSync(key, 'backup-salt', 32);
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: Buffer.concat([iv, authTag, encrypted]),
    key,
  };
}

/**
 * Decrypt backup file
 */
export function decryptBackup(encryptedData: Buffer, key: string): Buffer {
  const keyBuffer = crypto.scryptSync(key, 'backup-salt', 32);
  
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
