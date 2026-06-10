import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { sendPasswordResetEmail } from '@/lib/email/email'
import { logPasswordResetRequested } from '@/lib/audit/auditLogger'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim(),
  captchaId: z.string().optional(),
  captchaAnswer: z.string().optional(),
})

// Rate limiting for forgot password
const forgotPasswordAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 3

  const record = forgotPasswordAttempts.get(identifier)

  if (!record || now > record.resetTime) {
    forgotPasswordAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  record.count++
  return { allowed: true }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset with security hardening
 */
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitKey = clientIp

  try {
    // Rate limiting
    const rateLimit = checkRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.retryAfter,
          requiresCaptcha: true,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const body = await req.json()
    const validated = forgotPasswordSchema.parse(body)

    await connectDB()

    // Normalize email
    const normalizedEmail = validated.email.toLowerCase().trim()

    // Always return success for security (don't reveal if email exists)
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a reset link has been sent.',
    })

    // Find user
    const user = await PosUser.findOne({ email: normalizedEmail })
    if (!user) {
      // Don't reveal the email doesn't exist
      // Still increment rate limit
      return successResponse
    }

    // Delete any existing reset tokens for this user
    await Token.deleteMany({ userId: user._id, type: 'reset' })

    // Generate secure reset token (hashed storage)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Save with expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await Token.create({
      userId: user._id,
      token: tokenHash, // Store hashed version
      type: 'reset',
      expiresAt: expiresAt,
    })

    // Update user's last password reset timestamp
    await PosUser.findByIdAndUpdate(user._id, {
      $set: { lastPasswordResetAt: new Date() },
    })

    // Log the event
    await logPasswordResetRequested({
      userId: user._id.toString(),
      email: normalizedEmail,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') || 'unknown',
    })

    // Send reset email
    try {
      await sendPasswordResetEmail(normalizedEmail, resetToken, user.username)
      // Password reset email sent (audit logged)
    } catch (emailError) {
      console.error('[Auth] Failed to send reset email')
      // Don't fail the request - token is created, user can request again
    }

    // Clear rate limit on success
    forgotPasswordAttempts.delete(rateLimitKey)

    return successResponse
  } catch (error: any) {
    console.error('Forgot password error')

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}
