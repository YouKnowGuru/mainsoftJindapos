/**
 * License Storage Utility
 * Handles reading/writing license.json, trial.json, and .trial-lock files.
 * All files are stored in the Electron userData directory.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Encryption key for .trial-lock (obfuscation, not military-grade)
const LOCK_KEY = 'DhisumTseyig2026BhutanPOS';

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

/**
 * Must be called once from the main process with app.getPath('userData')
 */
export function initStoragePath(dataPath: string): void {
    userDataPath = dataPath;
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
// License File Operations
// ============================================

export function readLicense(): LicenseData | null {
    try {
        const filePath = getLicensePath();
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as LicenseData;
    } catch {
        return null;
    }
}

export function writeLicense(data: LicenseData): void {
    const filePath = getLicensePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function deleteLicense(): void {
    const filePath = getLicensePath();
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
        return JSON.parse(raw) as TrialData;
    } catch {
        return null;
    }
}

export function writeTrial(data: TrialData): void {
    const filePath = getTrialPath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================
// Trial Lock (Encrypted) Operations
// ============================================

function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(LOCK_KEY).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encrypted = parts.join(':');
    const key = crypto.createHash('sha256').update(LOCK_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function readTrialLock(): TrialLockData | null {
    try {
        const filePath = getTrialLockPath();
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, 'utf-8');
        const decrypted = decrypt(raw);
        return JSON.parse(decrypted) as TrialLockData;
    } catch {
        return null;
    }
}

export function writeTrialLock(data: TrialLockData): void {
    const filePath = getTrialLockPath();
    const encrypted = encrypt(JSON.stringify(data));
    fs.writeFileSync(filePath, encrypted, 'utf-8');
}
