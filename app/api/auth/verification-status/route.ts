import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import Session from '@/lib/models/Session'
import { verifyAccessToken, createSession, getTokenExpiryTimes } from '@/lib/auth/tokens'
import { validateDeviceFingerprint } from '@/lib/auth/device'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { z } from 'zod'

/**
 * GET /api/auth/verification-status
 * Poll endpoint for checking email verification status
 * Returns session tokens if verified
 */
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting to prevent enumeration abuse
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const email = req.nextUrl.searchParams.get('email')
    const deviceId = req.nextUrl.searchParams.get('deviceId')
    const deviceFingerprint = req.nextUrl.searchParams.get('fingerprint')
    const existingToken = req.headers.get('Authorization')?.replace('Bearer ', '')

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailSchema = z.string().email()
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    await connectDB()

    // Find user
    const user = await PosUser.findOne({ email: normalizedEmail })

    if (!user) {
      // Generic error to prevent enumeration
      return NextResponse.json(
        { success: false, verified: false, error: 'Account not found or not ready' },
        { status: 404 }
      )
    }

    // Check if verified
    if (!user.isVerified) {
      // Check if verification token exists and is valid
      const existingVerifyToken = await Token.findOne({
        userId: user._id,
        type: 'verify',
        expiresAt: { $gt: new Date() },
      })

      return NextResponse.json({
        success: false,
        verified: false,
        needsVerification: true,
        message: 'Email not verified. Please check your email and click the verification link.',
        canResend: !!existingVerifyToken,
        tokenExpiry: existingVerifyToken
          ? new Date(existingVerifyToken.expiresAt).toISOString()
          : null,
      })
    }

    // User is verified - check if we can create a session
    // If there's an existing token, validate it
    let existingSession = null
    if (existingToken) {
      const payload = verifyAccessToken(existingToken)
      if (payload) {
        existingSession = await Session.findById(payload.sessionId)
        if (existingSession && !existingSession.isRevoked && new Date() < existingSession.expiresAt) {
          // Valid session exists
          return NextResponse.json({
            success: true,
            verified: true,
            hasSession: true,
            message: 'Already authenticated',
          })
        }
      }
    }

    // Create new session if needed
    if (!existingSession) {
      // Validate device fingerprint if provided
      if (user.deviceFingerprint && deviceFingerprint) {
        const deviceValid = await validateDeviceFingerprint(
          user.deviceFingerprint,
          deviceFingerprint
        )
        if (!deviceValid) {
          return NextResponse.json({
            success: false,
            verified: true,
            needsStepUp: true,
            stepUpType: 'device_verification',
            message: 'Device verification required. Please log in with your credentials.',
          })
        }
      }

      // Get client info
const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'

      // Create new session with token pair
      const tokens = await createSession(
        user._id.toString(),
        deviceId || user.deviceId,
        deviceFingerprint || undefined,
        ipAddress,
        userAgent
      )

      // Update user's account status if pending
      if (user.accountStatus === 'pending_verification') {
        await PosUser.findByIdAndUpdate(user._id, {
          $set: { accountStatus: 'active' },
        })
      }

      // Check for trial expiration
      const isTrialExpired = user.trialEndDate && new Date() > user.trialEndDate

      return NextResponse.json({
        success: true,
        verified: true,
        hasSession: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        },
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          accountStatus: user.accountStatus,
          trialEndDate: user.trialEndDate,
          isTrialExpired,
          hasLicense: !!user.licenseKey,
          licenseKey: user.licenseKey,
        },
        tokenExpiry: getTokenExpiryTimes(),
      })
    }

    return NextResponse.json({
      success: true,
      verified: true,
      hasSession: false,
      message: 'Email verified. Please log in.',
    })
  } catch (error: any) {
    console.error('Verification status check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/verification-status
 * Check with password (for step-up auth after verification)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, deviceId, deviceFingerprint } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    await connectDB()

    const user = await PosUser.findOne({ email: normalizedEmail })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check account lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
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

    // Verify password
    const bcrypt = await import('bcryptjs')
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1
      const lockoutThreshold = 5

      if (failedAttempts >= lockoutThreshold) {
        const lockDuration = 15 * 60 * 1000 // 15 minutes
        await PosUser.findByIdAndUpdate(user._id, {
          $set: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: new Date(Date.now() + lockDuration),
          },
        })

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
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check verification
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          needsVerification: true,
          email: user.email,
        },
        { status: 403 }
      )
    }

    // Get client info
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Create session
    const tokens = await createSession(
      user._id.toString(),
      deviceId || user.deviceId,
      deviceFingerprint,
      ipAddress,
      userAgent
    )

    // Update user status
    await PosUser.findByIdAndUpdate(user._id, {
      $set: {
        accountStatus: user.accountStatus === 'pending_verification' ? 'active' : user.accountStatus,
        deviceId: deviceId || user.deviceId,
        deviceFingerprint: deviceFingerprint || user.deviceFingerprint,
      },
    })

    return NextResponse.json({
      success: true,
      verified: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      },
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        trialEndDate: user.trialEndDate,
        licenseKey: user.licenseKey,
      },
    })
  } catch (error: any) {
    console.error('Verification status POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
