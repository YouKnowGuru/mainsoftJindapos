/**
 * API helper for making requests to the backend
 * Automatically handles base URL for both web and desktop (POS) clients
 */

/**
 * Get the base API URL
 * Automatically detects if running on web or desktop/POS app
 */
export function getApiBaseUrl(): string {
  // In browser context (web app on Vercel), use relative URLs
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname

    // If running on the Vercel website or localhost, use relative paths
    if (
      currentHost.includes('jindapos.com') ||
      currentHost.includes('vercel.app') ||
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1'
    ) {
      return '' // Use relative URLs (e.g., /api/license/activate)
    }
  }

  // For desktop/POS app or any other context, use full Vercel URL
  return 'https://jindapos.com'
}

/**
 * Make an API request with proper URL handling
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  return fetch(url, config)
}

/**
 * Helper for GET requests
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiRequest(endpoint, { method: 'GET' })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

/**
 * Helper for POST requests
 */
export async function apiPost<T>(endpoint: string, body: any): Promise<T> {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}
