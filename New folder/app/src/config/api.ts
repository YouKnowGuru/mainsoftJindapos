/**
 * API Configuration
 * Centralized configuration for API endpoints
 * 
 * To change server URL:
 * 1. Create a .env file in the app/ directory with: VITE_API_URL=https://your-vercel-url
 * 2. Or update the DEFAULT_API_URL below
 */

// Default server URL — change this to your server URL
const DEFAULT_API_URL = 'https://jindapos.com';

// Get API URL from environment or use default
function getApiUrl(): string {
  // 1. Try VITE_API_URL from environment variable (highest priority)
  if (typeof process !== 'undefined' && (process as any).env?.VITE_API_URL) {
    return (process as any).env.VITE_API_URL;
  }

  // 2. Use the default server URL (Vercel or localhost)
  return DEFAULT_API_URL;
}

export const API_BASE_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  LICENSE_VERIFY: `${API_BASE_URL}/api/license/verify`,
  UPDATES_LATEST: `${API_BASE_URL}/api/updates/latest`,
  AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
  AUTH_STATUS: `${API_BASE_URL}/api/auth/status`,
  AUTH_FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
  AUTH_RESEND_VERIFICATION: `${API_BASE_URL}/api/auth/resend-verification`,
  AUTH_CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
} as const;

// Helper to check if API is available (useful for offline detection)
export async function isApiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
