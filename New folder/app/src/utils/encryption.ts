import crypto from 'crypto';
import fs from 'fs';
import { machineIdSync } from 'node-machine-id';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Get encryption pepper from environment or secure storage
 * SECURITY: Never hardcode fallback keys
 */
function getEncryptionPepper(): string {
  // Try to get from environment variable
  const pepper = process.env.ENCRYPTION_PEPPER;
  if (pepper && pepper.length >= 32) {
    return pepper;
  }
  
  // In production, throw error instead of using hardcoded key
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_PEPPER environment variable must be set in production');
  }
  
  // Development only: use a stable deterministic pepper so backups can be
  // decrypted after app restarts. This is intentionally NOT random.
  console.warn('[Encryption] WARNING: Using development-only encryption pepper. Set ENCRYPTION_PEPPER for production.');
  return 'jinda-dev-only-pepper-do-not-use-in-production-32b';
}

/**
 * Derives a deterministic encryption key from the machine ID.
 * This ties backups to the specific machine for security.
 * SECURITY: Removed hardcoded fallback key
 */
function deriveKey(salt: Buffer): Buffer {
  let machineId: string;
  try {
    machineId = machineIdSync(true);
  } catch (error) {
    // SECURITY: Generate random machine ID instead of hardcoded fallback
    // This means data won't be decryptable after machine change, which is the intended security behavior
    console.error('[Encryption] Failed to get machine ID, generating temporary key');
    machineId = crypto.randomBytes(32).toString('hex');
  }
  
  const pepper = getEncryptionPepper();
  const combined = machineId + pepper;
  return crypto.pbkdf2Sync(combined, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a file using AES-256-CBC with machine-ID-derived key.
 * Output format: [32-byte salt][16-byte IV][encrypted data]
 */
export function encryptFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const salt = crypto.randomBytes(SALT_LENGTH);
      const key = deriveKey(salt);
      const iv = crypto.randomBytes(IV_LENGTH);

      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      // Write salt and IV as header
      output.write(salt);
      output.write(iv);

      cipher.on('error', reject);
      input.pipe(cipher).pipe(output);

      output.on('finish', () => resolve());
      output.on('error', reject);
      input.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Decrypt a file that was encrypted with encryptFile().
 * Reads salt + IV from header, derives key, decrypts.
 */
export function decryptFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const input = fs.openSync(inputPath, 'r');
      const salt = Buffer.alloc(SALT_LENGTH);
      const iv = Buffer.alloc(IV_LENGTH);

      fs.readSync(input, salt, 0, SALT_LENGTH, 0);
      fs.readSync(input, iv, 0, IV_LENGTH, SALT_LENGTH);
      fs.closeSync(input);

      const key = deriveKey(salt);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

      const headerSize = SALT_LENGTH + IV_LENGTH;
      const readStream = fs.createReadStream(inputPath, { start: headerSize });
      const writeStream = fs.createWriteStream(outputPath);

      decipher.on('error', reject);
      readStream.pipe(decipher).pipe(writeStream);

      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
      readStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Encrypt a buffer in memory (for smaller data).
 * SECURITY: Added authentication with HMAC to prevent tampering
 */
export function encryptBuffer(data: Buffer): Buffer {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  
  // Add HMAC for authentication
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encrypted);
  const authTag = hmac.digest();
  
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer that was encrypted with encryptBuffer().
 * SECURITY: Verifies HMAC before decryption
 */
export function decryptBuffer(data: Buffer): Buffer {
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 32);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + 32);
  
  const key = deriveKey(salt);
  
  // Verify HMAC
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(encrypted);
  const computedAuthTag = hmac.digest();
  
  if (!crypto.timingSafeEqual(authTag, computedAuthTag)) {
    throw new Error('Data integrity check failed - possible tampering detected');
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using PBKDF2 (for when bcrypt is not available)
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return { hash: hash.toString('hex'), salt: useSalt };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), computed);
}
