import crypto from 'crypto'

export interface DeviceFingerprint {
  fingerprint: string
  components: {
    hardware?: string
    os?: string
    browser?: string
    screen?: string
    timezone?: string
    language?: string
  }
}

/**
 * Generate a device fingerprint from browser/system info
 * This helps detect unusual device access patterns
 */
export function generateDeviceFingerprint(deviceInfo: {
  userAgent?: string
  screenResolution?: string
  timezone?: string
  language?: string
  platform?: string
  hardwareConcurrency?: number
  deviceMemory?: number
}): DeviceFingerprint {
  const components = {
    hardware: deviceInfo.hardwareConcurrency
      ? `cores:${deviceInfo.hardwareConcurrency}:mem:${deviceInfo.deviceMemory || 'unknown'}`
      : 'unknown',
    os: deviceInfo.platform || 'unknown',
    browser: deviceInfo.userAgent
      ? extractBrowserInfo(deviceInfo.userAgent)
      : 'unknown',
    screen: deviceInfo.screenResolution || 'unknown',
    timezone: deviceInfo.timezone || 'unknown',
    language: deviceInfo.language || 'unknown',
  }

  // Create consistent hash from components
  const fingerprintData = JSON.stringify(components)
  const fingerprint = crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
    .substring(0, 64)

  return { fingerprint, components }
}

/**
 * Extract browser info from user agent
 */
function extractBrowserInfo(userAgent: string): string {
  const patterns = [
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
    { name: 'Edge', pattern: /Edg\/([\d.]+)/ },
    { name: 'Opera', pattern: /OPR\/([\d.]+)/ },
  ]

  for (const { name, pattern } of patterns) {
    const match = userAgent.match(pattern)
    if (match) {
      return `${name}:${match[1]}`
    }
  }

  return 'unknown'
}

/**
 * Calculate similarity score between two fingerprints
 * Returns 0-1 where 1 is identical
 */
export function compareFingerprints(
  storedFingerprint: string,
  currentFingerprint: string
): number {
  // Simple string comparison for now
  // In production, could compare individual components
  if (storedFingerprint === currentFingerprint) return 1.0

  // Calculate Jaccard similarity if hashes are different lengths
  const intersection = storedFingerprint
    .split('')
    .filter((char, i) => currentFingerprint[i] === char).length

  const union = Math.max(storedFingerprint.length, currentFingerprint.length)
  return intersection / union
}

/**
 * Validate device fingerprint against stored
 * Returns true if device is likely the same
 */
export async function validateDeviceFingerprint(
  storedFingerprint: string,
  currentFingerprint: string,
  threshold: number = 0.8
): Promise<boolean> {
  const similarity = compareFingerprints(storedFingerprint, currentFingerprint)
  return similarity >= threshold
}

/**
 * Generate machine-level device ID for Electron
 * This should be done in the main process, not renderer
 */
export function generateMachineDeviceId(): string {
  // This is a placeholder - actual implementation would use
  // node-machine-id in Electron main process
  return crypto.randomUUID()
}

/**
 * Check if device fingerprint has suspicious changes
 * Could indicate account takeover attempt
 */
export function detectSuspiciousDeviceChange(
  storedFingerprint: string,
  currentFingerprint: string,
  lastLoginAt?: Date
): { isSuspicious: boolean; reasons: string[] } {
  const reasons: string[] = []
  const similarity = compareFingerprints(storedFingerprint, currentFingerprint)

  // Significant device change
  if (similarity < 0.5) {
    reasons.push('Significant device characteristics change detected')
  }

  // New device after long absence
  if (lastLoginAt) {
    const daysSinceLastLogin = (Date.now() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastLogin > 30 && similarity < 0.9) {
      reasons.push('New device after extended period of inactivity')
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  }
}

/**
 * Rate limit device-level requests
 * Simple in-memory store - use Redis in production
 */
const deviceRequestStore = new Map<string, { count: number; resetTime: number }>()

export function checkDeviceRateLimit(
  deviceId: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = deviceRequestStore.get(deviceId)

  if (!record || now > record.resetTime) {
    // New window
    deviceRequestStore.set(deviceId, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Generate secure binding between license, user, and device
 */
export function generateLicenseDeviceBinding(
  licenseKey: string,
  userId: string,
  deviceId: string
): { bindingHash: string; signature: string } {
  const bindingData = `${licenseKey}:${userId}:${deviceId}`
  const bindingHash = crypto
    .createHash('sha256')
    .update(bindingData)
    .digest('hex')

  // Sign with server secret — NEVER use predictable fallback
  const secret = process.env.LICENSE_BINDING_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('LICENSE_BINDING_SECRET or NEXTAUTH_SECRET must be configured')
  }
  const signature = crypto
    .createHmac('sha256', secret)
    .update(bindingHash)
    .digest('hex')

  return { bindingHash, signature }
}

/**
 * Verify license-device binding
 */
export function verifyLicenseDeviceBinding(
  licenseKey: string,
  userId: string,
  deviceId: string,
  expectedSignature: string
): boolean {
  const { signature } = generateLicenseDeviceBinding(licenseKey, userId, deviceId)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}
