/**
 * Device ID Utility
 * Generates a unique, persistent hardware fingerprint for license binding.
 * This utility is isomorphic: it works in both Main and Renderer processes.
 */

// We use dynamic require for node-machine-id to avoid Vite bundling issues in the renderer
let machineIdSync: any = null;

// Determine environment
const isRenderer = typeof window !== 'undefined';
const isMain = !isRenderer;

if (isMain) {
    try {
        // Only require in Node environment
        machineIdSync = require('node-machine-id').machineIdSync;
    } catch (e) {
        console.error('[DeviceId] Failed to load node-machine-id in Main process:', e);
    }
}

let cachedId: string | null = null;

/**
 * Initialize the device identifier.
 * Renderer: Calls the secure bridge.
 * Main: Calls node-machine-id directly with persistent fallback.
 */
export async function initializeDeviceId(): Promise<string> {
    if (cachedId) return cachedId;

    if (isRenderer) {
        try {
            const secureAPI = (window as any).electronSecureAPI;
            if (secureAPI?.license?.getDeviceId) {
                const result = await secureAPI.license.getDeviceId();
                if (result) {
                    cachedId = result;
                    return cachedId as string;
                }
            }
        } catch (error) {
            console.warn('[DeviceId] Bridge call failed, using session fallback');
        }

        // Fallback for Renderer (Browser or Bridge failed)
        cachedId = localStorage.getItem('dhisum_session_device_id');
        if (!cachedId) {
            cachedId = 'browser-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('dhisum_session_device_id', cachedId);
        }
    } else {
        // Main Process
        cachedId = getDeviceIdSync();
    }

    return cachedId || 'unknown-device';
}

/**
 * Internal synchronous lookup for Main process with persistent fallback.
 */
function getDeviceIdSync(): string {
    try {
        if (machineIdSync) {
            return machineIdSync();
        }
    } catch (error) {
        console.error('[DeviceId] Failed to get machine ID in Main:', error);
    }

    // Persistent fallback for Main process (prevents ID changing on every restart)
    try {
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron');
        const crypto = require('crypto');
        
        // Use a stable path in userData
        const fallbackPath = path.join(app.getPath('userData'), '.device-id');
        
        if (fs.existsSync(fallbackPath)) {
            return fs.readFileSync(fallbackPath, 'utf8');
        } else {
            const fallbackId = 'dhisum-fallback-' + crypto.randomBytes(16).toString('hex');
            fs.writeFileSync(fallbackPath, fallbackId, 'utf8');
            return fallbackId;
        }
    } catch (fallbackError) {
        console.error('[DeviceId] Critical failure in persistent fallback:', fallbackError);
        return 'unknown-main-device';
    }
}

/**
 * Get the unique device identifier.
 * Returns the cached value or attempts a synchronous lookup (Main only).
 */
export function getDeviceId(): string {
    if (cachedId) return cachedId;
    
    if (isRenderer) {
        // Sync fallback for Renderer
        return localStorage.getItem('dhisum_session_device_id') || 'initializing...';
    } else {
        // Main Process - synchronous lookup
        cachedId = getDeviceIdSync();
        return cachedId;
    }
}
