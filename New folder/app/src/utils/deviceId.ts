/**
 * Device ID Utility
 * Generates a unique, persistent hardware fingerprint for license binding.
 * Uses node-machine-id which reads the OS machine GUID (stable across reboots).
 */
import { machineIdSync } from 'node-machine-id';

let cachedId: string | null = null;

/**
 * Get the unique device identifier for this machine.
 * Result is cached after first call for performance.
 */
export function getDeviceId(): string {
    if (!cachedId) {
        cachedId = machineIdSync(true); // true = original (not hashed)
    }
    return cachedId;
}
