import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import Session from '@/lib/models/Session'
import {
  logPasswordResetCompleted,
  logAccountUnlocked,
} from '@/lib/audit/auditLogger'
import { revokeAllUserSessions } from '@/lib/auth/tokens'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
})

// Rate limiting for reset attempts
const resetAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const record = resetAttempts.get(identifier)

  if (!record || now > record.resetTime) {
    resetAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
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
 * Hash token for comparison
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * POST /api/auth/reset-password
 * Reset password with hardened security
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
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const body = await req.json()
    const validated = resetPasswordSchema.parse(body)

    await connectDB()

    // Hash the provided token for lookup
    const tokenHash = hashToken(validated.token)

    // Find token by hash
    const tokenDoc = await Token.findOne({
      token: tokenHash,
      type: 'reset',
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) {
      // Check if token exists but is expired
      const expiredToken = await Token.findOne({
        token: tokenHash,
        type: 'reset',
      })

      if (expiredToken) {
        await Token.deleteOne({ _id: expiredToken._id })
        return NextResponse.json(
          { success: false, error: 'Reset link has expired. Please request a new one.' },
          { status: 410 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    // Find user
    const user = await PosUser.findById(tokenDoc.userId)
    if (!user) {
      await Token.deleteOne({ _id: tokenDoc._id })
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404 }
      )
    }

    // Hash new password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(validated.password, 12)

    // Update password and security fields
    await PosUser.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null, // Unlock account
        requirePasswordChange: false,
      },
    })

    // Revoke all existing sessions (force re-login)
    await revokeAllUserSessions(
      user._id.toString(),
      'Password reset - all sessions invalidated',
      undefined
    )

    // Delete all reset tokens for this user
    await Token.deleteMany({ userId: user._id, type: 'reset' })

    // Log the events
    await logPasswordResetCompleted({
      userId: user._id.toString(),
      email: user.email,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') || 'unknown',
    })

    if (user.lockedUntil) {
      await logAccountUnlocked({
        userId: user._id.toString(),
        email: user.email,
        ipAddress: clientIp,
        details: { reason: 'password_reset' },
      })
    }

    // Clear rate limit on success
    resetAttempts.delete(rateLimitKey)

    // Password reset success logged via audit system

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)

    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Password reset failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/reset-password
 * Validate reset token
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Hash token for lookup
    const tokenHash = hashToken(token)

    const tokenDoc = await Token.findOne({
      token: tokenHash,
      type: 'reset',
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) {
      // Check if expired
      const expiredToken = await Token.findOne({
        token: tokenHash,
        type: 'reset',
      })

      if (expiredToken) {
        await Token.deleteOne({ _id: expiredToken._id })
        return NextResponse.json(
          { success: false, error: 'Reset link has expired.' },
          { status: 410 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Invalid reset token.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid.',
      email: tokenDoc.email,
    })
  } catch (error: any) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Validation failed.' },
      { status: 500 }
    )
  }
}
