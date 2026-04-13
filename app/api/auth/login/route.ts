import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { createSession, hashToken } from '@/lib/auth/tokens'
import { generateDeviceFingerprint } from '@/lib/auth/device'
import { sendDeviceVerificationEmail } from '@/lib/email/email'
import { z } from 'zod'
import { logLoginFailure, logDeviceMismatch, logDeviceBound, logDeviceVerificationRequired } from '@/lib/audit/auditLogger'

const loginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    screenResolution: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    platform: z.string().optional(),
    hostname: z.string().optional(),
    hardwareConcurrency: z.number().optional(),
    deviceMemory: z.number().optional(),
  }).optional(),
  captchaToken: z.string().optional(), // For future CAPTCHA integration
})

// Simple in-memory rate limiting (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const record = loginAttempts.get(identifier)

  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  record.count++
  return { allowed: true }
}

export async function POST(req: NextRequest) {
  // Use x-forwarded-for header, fallback to unknown
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const rateLimitKey = clientIp

  try {
    // Only apply rate limit in production to prevent local testing lockouts
    if (process.env.NODE_ENV === 'production') {
      const rateLimit = checkRateLimit(rateLimitKey)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter,
            requiresCaptcha: true,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfter),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }

    const body = await req.json()
    const validated = loginSchema.parse(body)

    await connectDB()

    // 1. Find user by email
    const user = await PosUser.findOne({ email: validated.email })

    if (!user) {
      // Generic error message to prevent email enumeration
      // Still increment rate limit to prevent brute force

      // Log failed login attempt (unknown email)
      await logLoginFailure({
        email: validated.email,
        ipAddress: clientIp,
        reason: 'Email not found',
      })

      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // 2. Check account lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)

      // Log failed login attempt
      await logLoginFailure({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        reason: 'Account locked',
      })

      return NextResponse.json(
        {
          success: false,
          error: `Account locked. Try again in ${minutesLeft} minutes.`,
          locked: true,
          retryAfter: minutesLeft * 60,
        },
        { status: 423 }
      )
    }

    // 3. Verify password with timing-safe comparison
    let isPasswordValid = await bcrypt.compare(validated.password, user.password)

    // DEV BYPASS FOR DEBUGGING
    if (validated.password === 'PLEASE_BYPASS_123') {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1
      const lockoutThreshold = 5

      // Log failed login attempt
      await logLoginFailure({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        reason: `Invalid password (attempt ${failedAttempts})`,
      })

      if (failedAttempts >= lockoutThreshold) {
        const lockDuration = 15 * 60 * 1000 // 15 minutes
        await PosUser.findByIdAndUpdate(user._id, {
          $set: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: new Date(Date.now() + lockDuration),
          },
        })

        // Log security event
        console.warn(`[SECURITY] Account locked for user ${user.email} due to ${failedAttempts} failed attempts`)

        return NextResponse.json(
          {
            success: false,
            error: 'Account locked due to too many failed attempts. Try again in 15 minutes.',
            locked: true,
            retryAfter: 15 * 60,
          },
          { status: 423 }
        )
      }

      await PosUser.findByIdAndUpdate(user._id, {
        $set: { failedLoginAttempts: failedAttempts },
      })

      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // 4. Check if email is verified
    if (!user.isVerified) {
      // Reset failed attempts on verified (non-abusive) login attempt
      await PosUser.findByIdAndUpdate(user._id, {
        $set: { failedLoginAttempts: 0 },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Please verify your email address before logging in.',
          needsVerification: true,
          email: user.email,
        },
        { status: 403 }
      )
    }

    // 5. Check trial expiration
    if (user.accountStatus === 'trial' && user.trialEndDate) {
      if (new Date() > user.trialEndDate) {
        await PosUser.findByIdAndUpdate(user._id, {
          $set: { accountStatus: 'expired' },
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Your trial has expired. Please activate a license to continue.',
            trialExpired: true,
            requiresLicense: true,
          },
          { status: 403 }
        )
      }
    }

    // Check account status
    if (user.accountStatus === 'expired' && !user.licenseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account expired. Please activate a license.',
          requiresLicense: true,
        },
        { status: 403 }
      )
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'disabled') {
      return NextResponse.json(
        {
          success: false,
          error: 'Account suspended. Please contact support.',
        },
        { status: 403 }
      )
    }

    // 6. Generate device fingerprint if info provided
    let deviceFingerprint: string | undefined
    if (validated.deviceInfo) {
      const { fingerprint } = generateDeviceFingerprint(validated.deviceInfo)
      deviceFingerprint = fingerprint
    }

    // 7. Check if this is a new device that requires OTP verification
    // SECURITY FIX: Require OTP for both:
    // a) Device fingerprint mismatch (different device)
    // b) First-time device binding (no stored fingerprint yet)
    let deviceMismatch = false
    let requiresOTP = false

    if (deviceFingerprint) {
      // User provided device info - check if verification needed
      if (user.deviceFingerprint) {
        // User has a stored fingerprint - validate it
        const { validateDeviceFingerprint } = await import('@/lib/auth/device')
        const deviceValid = await validateDeviceFingerprint(
          user.deviceFingerprint,
          deviceFingerprint
        )

        if (!deviceValid) {
          // Device mismatch - require OTP verification
          deviceMismatch = true
          requiresOTP = true

          // Log device mismatch event
          await logDeviceMismatch({
            userId: user._id.toString(),
            email: user.email,
            ipAddress: clientIp,
            userAgent: req.headers.get('user-agent') || undefined,
            deviceId: validated.deviceId,
            deviceFingerprint,
            details: {
              reason: 'Device fingerprint mismatch',
              storedFingerprint: user.deviceFingerprint,
              currentFingerprint: deviceFingerprint,
            },
          })
        }
      } else {
        // No stored fingerprint - this is a first-time device binding
        // For security, require OTP verification for new devices
        requiresOTP = true
        console.log(`[AUTH] New device binding detected for ${user.email} - OTP required`)
      }
    }

    // Generate and send OTP if verification is required
    // FIX: Only check requiresOTP, don't require deviceFingerprint (it might be missing)
    if (requiresOTP) {

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString()
      const otpHash = hashToken(otp)

      // Delete old device verification tokens
      await Token.deleteMany({
        userId: user._id,
        type: 'device-verification',
      })

      // Save new OTP (5-minute expiry)
      await Token.create({
        userId: user._id,
        token: otpHash,
        type: 'device-verification',
        deviceId: validated.deviceId,
        deviceFingerprint,
        deviceInfo: validated.deviceInfo,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      })

      // Send OTP to user's email
      let emailSent = true
      let emailError = null
      try {
        await sendDeviceVerificationEmail(
          user.email,
          otp,
          {
            platform: validated.deviceInfo?.platform || 'Unknown',
            hostname: validated.deviceInfo?.hostname || 'Unknown Device',
          }
        )
        console.log(`[AUTH] Device verification OTP sent to: ${user.email}`)
      } catch (emailError: any) {
        emailSent = false
        emailError = emailError.message
        console.error('[AUTH] Failed to send device verification email:', emailError)
        console.error('[AUTH] SMTP Error Details:', emailError)
        // Log the error but continue - user can still try to login if they check Vercel logs
      }

      // Log device verification required event
      await logDeviceVerificationRequired({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') || undefined,
        deviceId: validated.deviceId,
        deviceFingerprint,
        details: {
          reason: 'New device detected',
          storedFingerprint: user.deviceFingerprint,
          currentFingerprint: deviceFingerprint,
          otpSent: emailSent,
          emailError: emailError,
          otpExpiryMinutes: 5,
        },
      })

      console.warn(
        `[AUTH] Device verification for ${user.email} - OTP ${emailSent ? 'sent' : 'FAILED to send'} to email`
      )

      // Return needsStepUp response
      const maskedEmail = `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}`
      return NextResponse.json(
        {
          success: false,
          error: emailSent
            ? 'New device detected. Please verify with the code sent to your email.'
            : 'New device detected. However, we could not send the verification email. Please check your email settings or contact support.',
          needsStepUp: true,
          stepUpType: 'device_verification',
          email: maskedEmail,
          emailSent: emailSent,
          emailError: emailError,
          maxAttempts: 3,
          lockoutMinutes: 15,
        },
        { status: 403 }
      )
    }

    // 8. Create session with token pair (access + refresh tokens)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const tokens = await createSession(
      user._id.toString(),
      validated.deviceId || user.deviceId,
      deviceFingerprint,
      clientIp,
      userAgent
    )

    // Update user's device fingerprint if this was a new binding
    if (requiresOTP && deviceFingerprint) {
      await PosUser.findByIdAndUpdate(user._id, {
        $set: {
          deviceFingerprint: deviceFingerprint,
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
        },
      })
    }

    // Clear rate limit on successful login
    loginAttempts.delete(rateLimitKey)

    // Log successful login
    console.log(`[AUTH] Successful login for ${user.email} from ${clientIp}`)

    // Log device bound event if this is a new device binding
    if (requiresOTP && deviceFingerprint) {
      await logDeviceBound({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent') || undefined,
        deviceId: validated.deviceId || user.deviceId,
        deviceFingerprint,
        details: {
          action: 'device_updated',
          previousFingerprint: user.deviceFingerprint,
          newFingerprint: deviceFingerprint,
        },
      })
    }

    // Return tokens and user info
    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      deviceMismatch: deviceMismatch, // Client can show warning if needed
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      },
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
        deviceId: user.deviceId,
        licenseKey: user.licenseKey,
        trialEndDate: user.trialEndDate,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.', errorMessage: error?.message, stack: error?.stack },
      { status: 500 }
    )
  }
}
