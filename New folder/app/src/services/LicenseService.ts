/**
 * License Service
 * Core business logic for trial management, license activation,
 * verification, and offline grace periods.
 */
import { getDeviceId } from '../utils/deviceId';
import {
    readLicense, writeLicense,
    readTrial, writeTrial,
    readTrialLock, writeTrialLock,
    initStoragePath,
    type LicenseData, type TrialData
} from '../utils/licenseStorage';

// ============================================
// Types
// ============================================

export type LicenseStatusType = 'trial' | 'licensed' | 'trial_expired' | 'license_expired' | 'verification_required' | 'none';

export interface LicenseStatus {
    type: LicenseStatusType;
    daysRemaining?: number;
    plan?: string;
    expiryDate?: string;
    licenseKey?: string;
    deviceId: string;
    maxUsers: number;
}

export interface ActivationResult {
    success: boolean;
    message: string;
    plan?: string;
    expiryDate?: string;
    isFirstActivation?: boolean;
}

// ============================================
// Constants
// ============================================

const TRIAL_DAYS = 7;
const OFFLINE_GRACE_DAYS = 30;
const API_BASE_URL = 'http://localhost:3000'; // Change to production domain before deployment

// ============================================
// License Service Class
// ============================================

export class LicenseService {
    private deviceId: string;

    constructor(userDataPath: string) {
        initStoragePath(userDataPath);
        this.deviceId = getDeviceId();
    }

    /**
     * Get the current license/trial status.
     * This is the main entry point called on every app startup.
     */
    getStatus(): LicenseStatus {
        const baseStatus = { deviceId: this.deviceId, maxUsers: 1 };

        // 1. Check for active license
        const license = readLicense();
        if (license) {
            // Verify device match
            if (license.deviceId !== this.deviceId) {
                return { ...baseStatus, type: 'license_expired' };
            }

            // Check expiry
            const expiry = new Date(license.expiryDate);
            const now = new Date();
            if (expiry < now) {
                return { ...baseStatus, type: 'license_expired', plan: license.plan };
            }

            // Check offline grace period
            const lastVerified = new Date(license.lastVerified);
            const daysSinceVerification = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceVerification > OFFLINE_GRACE_DAYS) {
                return { ...baseStatus, type: 'verification_required', plan: license.plan };
            }

            const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return {
                ...baseStatus,
                type: 'licensed',
                daysRemaining,
                plan: license.plan,
                expiryDate: license.expiryDate,
                licenseKey: license.licenseKey,
                maxUsers: license.maxUsers || this.getMaxUsersForPlan(license.plan),
            };
        }

        // 2. Check for trial
        const trial = readTrial();
        const trialLock = readTrialLock();

        if (trial) {
            // Verify device match
            if (trial.deviceId !== this.deviceId) {
                return { ...baseStatus, type: 'trial_expired' };
            }

            const endDate = new Date(trial.trialEndDate);
            const now = new Date();
            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysRemaining > 0) {
                return { ...baseStatus, type: 'trial', daysRemaining };
            } else {
                return { ...baseStatus, type: 'trial_expired' };
            }
        }

        // 3. Check trial lock (prevents trial reset if trial.json was deleted)
        if (trialLock && trialLock.deviceId === this.deviceId) {
            // Trial was already started on this device — check if it's expired
            const startDate = new Date(trialLock.trialStartDate);
            const endDate = new Date(startDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
            const now = new Date();

            if (endDate > now) {
                // Restore trial data
                const restoredTrial: TrialData = {
                    trialStartDate: trialLock.trialStartDate,
                    trialEndDate: endDate.toISOString(),
                    deviceId: this.deviceId,
                };
                writeTrial(restoredTrial);

                const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { ...baseStatus, type: 'trial', daysRemaining };
            } else {
                return { ...baseStatus, type: 'trial_expired' };
            }
        }

        // 4. No license, no trial — fresh install
        return { ...baseStatus, type: 'none' };
    }

    /**
     * Start the 7-day free trial.
     * Called when no license and no prior trial exists.
     */
    startTrial(): LicenseStatus {
        const now = new Date();
        const endDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

        const trialData: TrialData = {
            trialStartDate: now.toISOString(),
            trialEndDate: endDate.toISOString(),
            deviceId: this.deviceId,
        };

        // Write both trial.json and encrypted .trial-lock
        writeTrial(trialData);
        writeTrialLock({
            deviceId: this.deviceId,
            trialStartDate: now.toISOString(),
        });

        return {
            type: 'trial',
            daysRemaining: TRIAL_DAYS,
            deviceId: this.deviceId,
            maxUsers: 1,
        };
    }

    /**
     * Activate a license key by verifying with the API server.
     */
    async activate(licenseKey: string): Promise<ActivationResult> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/license/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseKey,
                    deviceId: this.deviceId,
                }),
            });

            if (!response.ok) {
                return { success: false, message: 'Server error. Please try again later.' };
            }

            const data = await response.json();

            if (data.valid) {
                // Save license locally
                const licenseData: LicenseData = {
                    licenseKey,
                    deviceId: this.deviceId,
                    plan: data.plan || 'standard',
                    expiryDate: data.expiryDate,
                    maxUsers: data.maxUsers || this.getMaxUsersForPlan(data.plan),
                    lastVerified: new Date().toISOString(),
                };
                writeLicense(licenseData);

                return {
                    success: true,
                    message: 'License activated successfully!',
                    plan: data.plan,
                    expiryDate: data.expiryDate,
                    isFirstActivation: data.isFirstActivation,
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Invalid license key. Please check and try again.',
                };
            }
        } catch (error: any) {
            // Network error — server unreachable
            return {
                success: false,
                message: 'Unable to reach the license server. Please check your internet connection.',
            };
        }
    }

    /**
     * Verify an existing license with the server (silent background check).
     * Updates the lastVerified timestamp on success.
     */
    async verifyWithServer(): Promise<boolean> {
        const license = readLicense();
        if (!license) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/license/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseKey: license.licenseKey,
                    deviceId: this.deviceId,
                }),
            });

            if (!response.ok) return false;

            const data = await response.json();

            if (data.valid) {
                // Update last verified timestamp
                license.lastVerified = new Date().toISOString();
                if (data.expiryDate) license.expiryDate = data.expiryDate;
                if (data.plan) license.plan = data.plan;
                if (data.maxUsers) license.maxUsers = data.maxUsers;
                writeLicense(license);
                return true;
            }

            return false;
        } catch {
            // Offline — no problem, grace period handles this
            return false;
        }
    }

    /**
     * Get trial information for the banner display.
     */
    getTrialInfo(): { isActive: boolean; daysRemaining: number } {
        const trial = readTrial();
        if (!trial || trial.deviceId !== this.deviceId) {
            return { isActive: false, daysRemaining: 0 };
        }

        const endDate = new Date(trial.trialEndDate);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return { isActive: daysRemaining > 0, daysRemaining };
    }

    /**
     * Map plan names to max allowed users.
     * starter (1-yr) = 1
     * growth (2-yr) = 2
     * enterprise (3-yr) = 5
     */
    private getMaxUsersForPlan(plan?: string): number {
        if (!plan) return 1;
        const p = plan.toLowerCase();
        if (p.includes('enterprise') || p.includes('lifetime')) return 5;
        if (p.includes('growth') || p.includes('pro')) return 2;
        return 1; // starter or trial
    }
}
