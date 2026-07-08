/**
 * Update Service
 * Checks for new application versions from the API server.
 */
import { API_BASE_URL } from '../config/api';

export interface UpdateInfo {
    available: boolean;
    version?: string;
    notes?: string;
    downloadUrl?: string;
}

export class UpdateService {
    private currentVersion: string;

    constructor(currentVersion: string) {
        this.currentVersion = currentVersion;
    }

    /**
     * Check for updates by querying the API server.
     * Returns update info if a newer version is available.
     */
    async checkForUpdates(): Promise<UpdateInfo> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/updates/latest`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                return { available: false };
            }

            const data = await response.json();

            if (data.version && this.isNewerVersion(data.version)) {
                return {
                    available: true,
                    version: data.version,
                    notes: data.notes || 'Bug fixes and improvements.',
                    downloadUrl: data.downloadUrl,
                };
            }

            return { available: false };
        } catch {
            // Offline or server error — silently fail
            return { available: false };
        }
    }

    /**
     * Compare semver strings: returns true if remote > current
     */
    private isNewerVersion(remoteVersion: string): boolean {
        const current = this.currentVersion.split('.').map(Number);
        const remote = remoteVersion.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            const c = current[i] || 0;
            const r = remote[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }
}
