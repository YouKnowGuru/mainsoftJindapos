/**
 * AuthService - Secure authentication service for POS SaaS
 * Implements:
 * - Server-side authentication with token rotation
 * - Secure token storage
 * - Verification polling
 * - Session management
 */
import { API_BASE_URL } from '../config/api';
import { secureStorage, TokenManager } from '../utils/secureStorage';
import type { TokenData } from '../utils/secureStorage';


export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
  accountStatus: 'active' | 'pending_verification' | 'trial' | 'expired' | 'suspended' | 'disabled';
  deviceId?: string;
  licenseKey?: string;
  trialEndDate?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  tokens?: TokenData;
  user?: AuthUser;
  needsVerification?: boolean;
  needsStepUp?: boolean;
  stepUpType?: string;
  trialExpired?: boolean;
  requiresLicense?: boolean;
  locked?: boolean;
  retryAfter?: number;
  userId?: string;
  email?: string;
  requiresReauth?: boolean;
  attemptsRemaining?: number;
}

export interface VerificationStatusResponse {
  success: boolean;
  verified: boolean;
  error?: string;
  needsVerification?: boolean;
  canResend?: boolean;
  hasSession?: boolean;
  tokens?: TokenData;
  user?: AuthUser;
  message?: string;
}

// Device fingerprint helper
function generateDeviceFingerprint(): object {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
  };
}

// Make authenticated request
async function makeRequest(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object,
  requireAuth: boolean = false,
  signal?: AbortSignal,
  _retryCount: number = 0
): Promise<any> {
  // NEVER retry on the refresh endpoint itself - prevents infinite loops
  // when refresh token is invalid/expired
  const isRefreshEndpoint = url.includes('/api/auth/refresh');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = await TokenManager.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Use Electron IPC if available (check both electronAPI and electronSecureAPI)
  const electronAPI = (window as any).electronAPI?.posAuth?.saasRequest
    ? (window as any).electronAPI
    : (window as any).electronSecureAPI?.posAuth?.saasRequest
      ? (window as any).electronSecureAPI
      : null;

  if (electronAPI?.posAuth?.saasRequest) {
    console.log('[makeRequest] Using Electron IPC path');
    const response = await electronAPI.posAuth.saasRequest({
      url,
      method,
      body,
      headers,
    });

    console.log('[makeRequest] Electron IPC response:', {
      ok: response.ok,
      status: response.status,
      hasData: !!response.data,
      needsStepUp: response.data?.needsStepUp,
    });

    if (!response.ok) {
      // Handle token expiration — limit retries to prevent infinite loops
      // CRITICAL: Never retry on refresh endpoint itself to avoid recursion
      if (response.status === 401 && _retryCount < 1 && !isRefreshEndpoint) {
        const refreshed = await AuthService.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token (max 1 retry)
          return makeRequest(url, method, body, requireAuth, signal, _retryCount + 1);
        }
      }

      // SPECIAL CASE: Device step-up verification - return data, don't throw
      if (response.data?.needsStepUp) {
        console.log('[makeRequest] Returning needsStepUp data from Electron IPC');
        return response.data;
      }

      // Attach response data to error for proper error handling upstream
      const error: any = new Error(response.data?.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.responseData = response.data;
      throw error;
    }

    return response.data;
  }

  console.log('[makeRequest] Using fetch path');

  // Fallback to fetch with optional timeout signal
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle token expiration
    if (response.status === 401 && data.requiresReauth) {
      await secureStorage.clearTokens();
    }

    // SPECIAL CASE: Device step-up verification is not an error, it's a required flow
    // Don't throw, return the data so the caller can handle it
    if (data.needsStepUp) {
      return data;
    }

    // Preserve response data in error for other cases
    const error: any = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.responseData = data;

    throw error;
  }

  return data;
}

export class AuthService {
  private static pollingInterval: NodeJS.Timeout | null = null;
  private static isRefreshing = false;

  /**
   * Register a new POS user account
   */
  static async register(
    username: string,
    email: string,
    password: string,
    options: {
      deviceId?: string;
      licenseKey?: string;
      isTrial?: boolean;
    } = {}
  ): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/register`;

      // Always ensure we have the real hardware device ID
      let finalDeviceId = options.deviceId;
      if (!finalDeviceId) {
        try {
          finalDeviceId = await this.getDeviceId();
        } catch (e) {
          console.warn('[AuthService.register] Failed to fetch device ID:', e);
        }
      }

      const body = {
        username,
        email,
        password,
        deviceId: finalDeviceId,
        licenseKey: options.licenseKey,
        isTrial: options.isTrial,
      };

      const data = await makeRequest(url, 'POST', body);

      return {
        success: data.success,
        message: data.message,
        userId: data.userId,
        needsVerification: data.requiresVerification,
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
      };
    }
  }

  /**
   * Login a POS user
   */
  static async login(
    email: string,
    password: string,
    deviceId?: string
  ): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/login`;
      console.log('[AuthService.login] Calling server:', url);
      
      // Auto-fetch device ID if not provided
      let finalDeviceId = deviceId;
      if (!finalDeviceId) {
        try {
          finalDeviceId = await this.getDeviceId();
        } catch (e) {
          console.warn('[AuthService.login] Failed to fetch device ID:', e);
        }
      }

      const body = {
        email,
        password,
        deviceId: finalDeviceId,
        deviceInfo: generateDeviceFingerprint(),
      };

      const data = await makeRequest(url, 'POST', body);

      if (data.success && data.tokens) {
        // Store tokens securely
        await secureStorage.setTokens(data.tokens);

        // Start auto-refresh
        TokenManager.startAutoRefresh(() => this.refreshAccessToken());
      }

      return {
        success: data.success,
        message: data.message,
        tokens: data.tokens,
        user: data.user,
        needsVerification: data.needsVerification,
        needsStepUp: data.needsStepUp,
        stepUpType: data.stepUpType,
        trialExpired: data.trialExpired,
        requiresLicense: data.requiresLicense,
        locked: data.locked,
        retryAfter: data.retryAfter,
        email: data.email,
      };
    } catch (error: any) {
      console.error('[AuthService.login] Login error:', error);
      console.error('[AuthService.login] Error details:', {
        message: error.message,
        needsStepUp: error.needsStepUp,
        responseData: error.responseData,
        status: error.status,
      });

      // Check if error contains step-up verification data
      // This happens when server returns 403 with needsStepUp=true
      if (error?.needsStepUp || error?.message?.includes('device') || error?.message?.includes('verify')) {
        return {
          success: false,
          error: error.message || 'Device verification required',
          message: error.message || 'Device verification required',
          needsStepUp: error.needsStepUp || true,
          stepUpType: error.stepUpType || 'device_verification',
          email: error.email,
        };
      }

      // Extract error message from server response
      // The error could be in error.message, error.responseData.error, or error.responseData.message
      const errorMessage =
        error?.responseData?.error ||
        error?.responseData?.message ||
        error?.message ||
        'Login failed. Please try again.';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  /**
   * Verify device with OTP code
   */
  static async verifyDevice(data: {
    email: string;
    otp: string;
    deviceId?: string;
    deviceInfo?: any;
  }): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/verify-device`;
      const response = await makeRequest(url, 'POST', data);
      
      return {
        success: true,
        tokens: response.tokens,
        user: response.user,
        message: response.message
      };
    } catch (error: any) {
      console.error('Device verification error:', error);
      return {
        success: false,
        error: error.message || 'Verification failed',
        locked: error.responseData?.lockedOut,
        retryAfter: error.responseData?.lockoutMinutes,
        attemptsRemaining: error.responseData?.attemptsRemaining
      };
    }
  }

  /**
   * Resend device verification code
   */
  static async resendDeviceCode(data: {
    email: string;
    deviceId?: string;
    deviceInfo?: any;
  }): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/resend-device-code`;
      const response = await makeRequest(url, 'POST', data);
      
      return {
        success: true,
        message: response.message,
        retryAfter: response.resendCooldownSeconds
      };
    } catch (error: any) {
      console.error('Resend code error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend code'
      };
    }
  }

  /**
   * Poll verification status
   * Returns tokens when verified
   */
  static async pollVerificationStatus(
    email: string,
    onVerified: (response: VerificationStatusResponse) => void,
    onError: (error: string) => void,
    intervalMs: number = 5000
  ): Promise<void> {
    // Clear any existing polling
    this.stopPolling();

    const checkStatus = async () => {
      try {
        const deviceId = await this.getDeviceId();
        const url = new URL(`${API_BASE_URL}/api/auth/verification-status`);
        url.searchParams.set('email', email);
        if (deviceId) url.searchParams.set('deviceId', deviceId);

        const token = await TokenManager.getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const data = await makeRequest(url.toString(), 'GET', undefined, false);

        if (data.success && data.verified && data.tokens) {
          // Store tokens
          await secureStorage.setTokens(data.tokens);

          // Start auto-refresh
          TokenManager.startAutoRefresh(() => this.refreshAccessToken());

          // Stop polling
          this.stopPolling();

          onVerified({
            success: true,
            verified: true,
            tokens: data.tokens,
            user: data.user,
          });
        } else if (!data.verified) {
          // Continue polling
          onVerified({
            success: false,
            verified: false,
            needsVerification: data.needsVerification,
            canResend: data.canResend,
            message: data.message,
          });
        }
      } catch (error: any) {
        console.error('Verification status check error:', error);
        onError(error.message || 'Failed to check verification status');
      }
    };

    // Initial check
    await checkStatus();

    // Set up polling
    this.pollingInterval = setInterval(checkStatus, intervalMs);
  }

  /**
   * Stop polling verification status
   */
  static stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Check verification status once (manual check)
   */
  static async checkVerificationStatus(email: string): Promise<VerificationStatusResponse> {
    try {
      const deviceId = await this.getDeviceId();
      const url = new URL(`${API_BASE_URL}/api/auth/verification-status`);
      url.searchParams.set('email', email);
      if (deviceId) url.searchParams.set('deviceId', deviceId);

      const data = await makeRequest(url.toString(), 'GET');

      if (data.success && data.verified && data.tokens) {
        await secureStorage.setTokens(data.tokens);
        TokenManager.startAutoRefresh(() => this.refreshAccessToken());
      }

      return {
        success: data.success,
        verified: data.verified,
        tokens: data.tokens,
        user: data.user,
        needsVerification: data.needsVerification,
        canResend: data.canResend,
        hasSession: data.hasSession,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Check verification status error:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to check status',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<boolean> {
    // Prevent concurrent refresh calls
    if (this.isRefreshing) {
      console.log('[AuthService] Refresh already in progress, skipping');
      return false;
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await TokenManager.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const url = `${API_BASE_URL}/api/auth/refresh`;
      const body = {
        refreshToken,
        deviceInfo: generateDeviceFingerprint(),
      };

      const data = await makeRequest(url, 'POST', body);

      if (data.success && data.tokens) {
        await secureStorage.setTokens(data.tokens);
        return true;
      }

      // Token reuse detected or invalid - force reauth
      await secureStorage.clearTokens();
      TokenManager.stopAutoRefresh();
      return false;
    } catch (error: any) {
      console.error('Token refresh error:', error?.message || error);
      // Any refresh failure means session is dead - clear tokens and stop refresh
      await secureStorage.clearTokens();
      TokenManager.stopAutoRefresh();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout user and revoke session
   */
  static async logout(revokeAll: boolean = false): Promise<boolean> {
    // Clear local tokens immediately for fast UX
    await secureStorage.clearTokens();
    TokenManager.stopAutoRefresh();
    this.stopPolling();

    // Fire-and-forget server logout (don't block UX on network)
    try {
      const url = `${API_BASE_URL}/api/auth/logout`;
      const body = { revokeAll };

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      await makeRequest(url, 'POST', body, true, controller.signal);

      clearTimeout(timeoutId);
    } catch (error) {
      // Don't fail logout if server unreachable
      console.warn('Server logout failed (user still logged out locally):', error);
    }

    return true;
  }

  /**
   * Request a password reset email
   */
  static async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/forgot-password`;
      const body = { email };

      const data = await makeRequest(url, 'POST', body);

      return {
        success: data.success,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset email. Please try again.',
      };
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/resend-verification`;
      const body = { email };

      const data = await makeRequest(url, 'POST', body);

      return {
        success: data.success,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend verification email.',
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/reset-password`;
      const body = { token, newPassword };

      const data = await makeRequest(url, 'POST', body);

      return {
        success: data.success,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password.',
      };
    }
  }

  /**
   * Change password (authenticated)
   */
  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> {
    try {
      const url = `${API_BASE_URL}/api/auth/change-password`;
      const body = { currentPassword, newPassword };

      const data = await makeRequest(url, 'POST', body, true);

      return {
        success: data.success,
        message: data.message,
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to change password.',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const tokens = await secureStorage.getTokens();
      if (!tokens) return null;

      // TODO: Implement user info endpoint
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const tokens = await secureStorage.getTokens();
    if (!tokens) return false;

    // Check if token is expired
    const expiresAt = new Date(tokens.expiresAt);
    if (expiresAt <= new Date()) {
      // Try to refresh
      return await this.refreshAccessToken();
    }

    return true;
  }

  /**
   * Get access token for API requests
   */
  static async getAccessToken(): Promise<string | null> {
    return TokenManager.getAccessToken();
  }

  /**
   * Get device ID from Electron
   */
  private static async getDeviceId(): Promise<string | undefined> {
    const bridge = (window as any).electronSecureAPI;
    if (typeof window !== 'undefined' && bridge?.app?.getDeviceId) {
      return await bridge.app.getDeviceId();
    }
    return undefined;
  }
}

export default AuthService;
