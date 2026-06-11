import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { hashToken } from '@/lib/auth/tokens'
import { generateDeviceFingerprint } from '@/lib/auth/device'
import { sendDeviceVerificationEmail } from '@/lib/email/email'
import { z } from 'zod'
import {
  logVerificationResend,
  logRateLimitTriggered,
  logSuspiciousActivity,
} from '@/lib/audit/auditLogger'
import { rateLimit } from '@/lib/rate-limit/rate-limit'

const resendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  deviceId: z.string().optional(),
  deviceInfo: z.object({
    platform: z.string().optional(),
    hostname: z.string().optional(),
    username: z.string().optional(),
  }).optional(),
})

/**
 * POST /api/auth/resend-device-code
 * Resend device verification OTP (rate limited)
 */
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'

  try {
    // Apply Redis-backed rate limiting: 1 request per 30 seconds
    const rateLimitResponse = await rateLimit(req, {
      windowMs: 30 * 1000, // 30 seconds
      maxRequests: 1,
    })

    if (rateLimitResponse) {
      // Rate limit exceeded - parse and return appropriate response
      const rateLimitData = await rateLimitResponse.json()
      const retryAfter = rateLimitData.retryAfter || 30

      await logRateLimitTriggered({
        ipAddress: clientIp,
        endpoint: '/api/auth/resend-device-code',
        details: {
          retryAfterSeconds: retryAfter,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${retryAfter} seconds before requesting another code`,
          resendCooldownSeconds: retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await req.json()
    const validated = resendCodeSchema.parse(body)

    await connectDB()

    // Find user
    const user = await PosUser.findOne({ email: validated.email.toLowerCase() })
    if (!user) {
      // Generic response to prevent email enumeration
      // Log suspicious activity
      await logSuspiciousActivity({
        email: validated.email.toLowerCase(),
        ipAddress: clientIp,
        deviceId: validated.deviceId,
        activity: 'resend_code_unknown_user',
        details: {
          reason: 'Attempted to resend code for unknown user',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'If the email exists, a verification code has been sent',
        email: 'masked',
        resendCooldownSeconds: 30,
      })
    }

    // Generate new 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const otpHash = hashToken(otp)

    // Delete old device verification tokens for this user
    await Token.deleteMany({
      userId: user._id,
      type: 'device-verification',
    })

    // Generate proper device fingerprint (same format as login route)
    let deviceFingerprint: string | undefined
    if (validated.deviceInfo) {
      const { fingerprint } = generateDeviceFingerprint(validated.deviceInfo)
      deviceFingerprint = fingerprint
    }

    // Save new OTP
    await Token.create({
      userId: user._id,
      token: otpHash,
      type: 'device-verification',
      deviceId: validated.deviceId,
      deviceFingerprint: deviceFingerprint || null,
      deviceInfo: validated.deviceInfo,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    })

    // Send email
    await sendDeviceVerificationEmail(
      user.email,
      otp,
      {
        platform: validated.deviceInfo?.platform,
        hostname: validated.deviceInfo?.hostname,
      }
    )

    // Log verification resend
    await logVerificationResend({
      userId: user._id.toString(),
      email: user.email,
      ipAddress: clientIp,
      deviceId: validated.deviceId,
      details: {
        reason: 'device_verification',
        deviceInfo: validated.deviceInfo,
      },
    })

    // Mask email for response
    const maskedEmail = `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}`

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      email: maskedEmail,
      resendCooldownSeconds: 30,
    })
  } catch (error: any) {
    console.error('Resend device code error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
