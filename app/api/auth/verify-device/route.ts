import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { createSession, hashToken } from '@/lib/auth/tokens'
import { generateDeviceFingerprint } from '@/lib/auth/device'
import { z } from 'zod'
import {
  logDeviceBound,
  logDeviceMismatch,
  logAccountLocked,
  logSuspiciousActivity,
} from '@/lib/audit/auditLogger'

const verifyDeviceSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  deviceId: z.string().optional(),
  deviceInfo: z.object({
    platform: z.string().optional(),
    hostname: z.string().optional(),
    username: z.string().optional(),
  }).optional(),
})

/**
 * POST /api/auth/verify-device
 * Verify device OTP and approve the device for login
 */
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'

  try {
    const body = await req.json()
    const validated = verifyDeviceSchema.parse(body)

    await connectDB()

    // Find user by email
    const user = await PosUser.findOne({ email: validated.email.toLowerCase() })
    if (!user) {
      // Generic error to prevent email enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if user is locked out
    if (user.deviceVerificationLockedUntil && user.deviceVerificationLockedUntil > new Date()) {
      const lockoutMinutes = Math.ceil(
        (user.deviceVerificationLockedUntil.getTime() - Date.now()) / (1000 * 60)
      )

      await logAccountLocked({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        deviceId: validated.deviceId,
        reason: 'Too many device verification attempts',
        details: {
          lockoutMinutes,
          lockedUntil: user.deviceVerificationLockedUntil,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Please try again in ${lockoutMinutes} minutes.`,
          lockedOut: true,
          lockoutMinutes,
        },
        { status: 429 }
      )
    }

    // Find valid OTP token
    const otpHash = hashToken(validated.otp)
    console.log(`[Device Verify] Looking for OTP token for user: ${user.email}`)
    console.log(`[Device Verify] OTP hash: ${otpHash.substring(0, 16)}...`)

    const tokenDoc = await Token.findOne({
      userId: user._id,
      token: otpHash,
      type: 'device-verification',
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) {
      console.log(`[Device Verify] Token not found or expired for ${user.email}`)

      // Increment failed attempts
      user.deviceVerificationAttempts = (user.deviceVerificationAttempts || 0) + 1

      // Log failed verification attempt
      await logDeviceMismatch({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        deviceId: validated.deviceId,
        details: {
          reason: 'Invalid device verification OTP',
          attemptsRemaining: 3 - user.deviceVerificationAttempts,
          willLockout: user.deviceVerificationAttempts >= 2, // Will lock on next attempt (3 total)
        },
      })

      // Lock out after 3 failed attempts
      if (user.deviceVerificationAttempts >= 3) {
        user.deviceVerificationLockedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        await user.save()

        await logAccountLocked({
          userId: user._id.toString(),
          email: user.email,
          ipAddress: clientIp,
          deviceId: validated.deviceId,
          reason: 'Device verification locked after 3 failed attempts',
          details: {
            lockoutMinutes: 15,
            lockedUntil: user.deviceVerificationLockedUntil,
          },
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Too many failed attempts. Account locked for 15 minutes.',
            lockedOut: true,
            lockoutMinutes: 15,
          },
          { status: 429 }
        )
      }

      await user.save()

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired verification code',
          attemptsRemaining: 3 - user.deviceVerificationAttempts,
          lockedOut: false,
        },
        { status: 400 }
      )
    }

    // OTP is valid - approve device
    console.log(`[Device Verify] OTP valid for ${user.email} - approving device`)

    const deviceFingerprint = tokenDoc.deviceFingerprint || null

    // Add to approved devices list
    user.approvedDevices = user.approvedDevices || []
    user.approvedDevices.push({
      deviceId: validated.deviceId || tokenDoc.deviceId || 'unknown',
      fingerprint: deviceFingerprint || 'unknown',
      deviceName: validated.deviceInfo?.hostname || `${validated.deviceInfo?.platform || 'Unknown'} Device`,
      approvedAt: new Date(),
      lastUsedAt: new Date(),
      ipAddress: clientIp,
    })

    // Reset verification attempts
    user.deviceVerificationAttempts = 0
    user.deviceVerificationLockedUntil = null

    // Update user's current device fingerprint
    if (deviceFingerprint) {
      user.deviceFingerprint = deviceFingerprint
    }
    if (validated.deviceId) {
      user.deviceId = validated.deviceId
    }
    user.lastLoginAt = new Date()
    user.lastLoginIp = clientIp

    await user.save()

    // Delete the used token
    await Token.deleteOne({ _id: tokenDoc._id })

    // Log successful device verification
    await logDeviceBound({
      userId: user._id.toString(),
      email: user.email,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') || undefined,
      deviceId: validated.deviceId || user.deviceId,
      deviceFingerprint: deviceFingerprint || undefined,
      details: {
        action: 'device_approved',
        deviceName: validated.deviceInfo?.hostname || `${validated.deviceInfo?.platform || 'Unknown'} Device`,
        approvedDevicesCount: user.approvedDevices.length,
      },
    })

    // Create session tokens
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const sessionId = await createSession(
      user._id.toString(),
      validated.deviceId || user.deviceId,
      deviceFingerprint,
      clientIp,
      userAgent
    )

    console.log(`[AUTH] Device verified and approved for ${user.email} from ${clientIp}`)

    return NextResponse.json({
      success: true,
      message: 'Device verified successfully',
      deviceApproved: true,
      tokens: {
        accessToken: sessionId.accessToken,
        refreshToken: sessionId.refreshToken,
        expiresAt: sessionId.expiresAt.toISOString(),
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
    console.error('[Device Verify] Error:', error.message)
    console.error('[Device Verify] Stack:', error.stack)
    console.error('[Device Verify] Full error:', error)

    if (error instanceof z.ZodError) {
      console.error('[Device Verify] Validation errors:', error.errors)
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    // Log suspicious activity on error
    try {
      const body = await req.json().catch(() => null)
      if (body?.email) {
        await logSuspiciousActivity({
          email: body.email.toLowerCase(),
          ipAddress: clientIp,
          deviceId: body.deviceId,
          activity: 'device_verification_error',
          details: {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        })
      }
    } catch {
      // Don't fail on audit logging
    }

    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.', errorMessage: error.message },
      { status: 500 }
    )
  }
}
