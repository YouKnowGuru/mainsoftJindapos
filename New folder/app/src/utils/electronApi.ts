/**
 * Electron API Utility
 * Safe wrapper for accessing window.electronSecureAPI with proper null checks
 */

// Get electronSecureAPI safely - returns null if not available (e.g., browser mode)
export function getElectronAPI() {
  if (typeof window === 'undefined') return null;
  return window.electronSecureAPI ?? null;
}

// Check if running in Electron mode
export function isElectron() {
  return typeof window !== 'undefined' && !!window.electronSecureAPI;
}

// Safe wrapper for electronSecureAPI methods with fallback
export function safeElectronCall<T>(
  method: (api: NonNullable<typeof window.electronSecureAPI>) => Promise<T>,
  fallbackValue: T,
  errorMessage?: string
): Promise<T> {
  const api = getElectronAPI();
  if (!api) {
    console.warn(errorMessage ?? 'Electron API not available, using fallback');
    return Promise.resolve(fallbackValue);
  }
  return method(api);
}

// Safe wrapper that throws error instead of fallback
export function requireElectronCall<T>(
  method: (api: NonNullable<typeof window.electronSecureAPI>) => Promise<T>,
  featureName: string
): Promise<T> {
  const api = getElectronAPI();
  if (!api) {
    throw new Error(`${featureName} requires Electron environment`);
  }
  return method(api);
}
