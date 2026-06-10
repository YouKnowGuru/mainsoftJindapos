import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import { verifyAccessToken, revokeAllUserSessions } from '@/lib/auth/tokens'
import { logPasswordChanged } from '@/lib/audit/auditLogger'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
})

// Rate limiting for password changes
const changePasswordAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxAttempts = 5

  const record = changePasswordAttempts.get(identifier)

  if (!record || now > record.resetTime) {
    changePasswordAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
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
 * POST /api/auth/change-password
 * Change password with authentication
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

    // 1. Verify Authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Session expired. Please log in again.' },
        { status: 401 }
      )
    }

    // 2. Validate Input
    const body = await req.json()
    const validated = changePasswordSchema.parse(body)

    await connectDB()

    // 3. Find User
    const user = await PosUser.findById(payload.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // 4. Verify Current Password
    const isMatch = await bcrypt.compare(validated.currentPassword, user.password)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Incorrect current password' },
        { status: 400 }
      )
    }

    // 5. Hash & Save New Password (12 rounds)
    const hashedPassword = await bcrypt.hash(validated.newPassword, 12)

    await PosUser.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    })

    // 6. Revoke all other sessions (keep current)
    await revokeAllUserSessions(
      user._id.toString(),
      'Password changed - other sessions invalidated',
      payload.sessionId
    )

    // 7. Log the event
    await logPasswordChanged({
      userId: user._id.toString(),
      email: user.email,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent') || 'unknown',
      sessionId: payload.sessionId,
    })

    // Clear rate limit on success
    changePasswordAttempts.delete(rateLimitKey)

    // Password changed (audit logged)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Other sessions have been logged out.',
    })
  } catch (error: any) {
    console.error('Change password API error:', error)

    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
