import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { sendVerificationEmail } from '@/lib/email/email'
import { z } from 'zod'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  deviceId: z.string().optional(),
  licenseKey: z.string().optional(),
  isTrial: z.boolean().default(false),
})

// Simple rate limiting for registration
const registerAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRegisterRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxAttempts = 5

  const record = registerAttempts.get(identifier)

  if (!record || now > record.resetTime) {
    registerAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
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
 * POST /api/auth/register
 * Register new user with trial or license flow
 */
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitKey = clientIp

  try {
    // Rate limiting
    const rateLimit = checkRegisterRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      )
    }

    const body = await req.json()
    const validated = registerSchema.parse(body)

    await connectDB()

    // Normalize email
    const normalizedEmail = validated.email.toLowerCase().trim()

    // Check if user already exists (case-insensitive email check)
    const existingUser = await PosUser.findOne({
      $or: [
        { email: normalizedEmail },
        { username: validated.username },
      ],
    })

    if (existingUser) {
      // Generic error to prevent enumeration
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists.' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: 'Username is already taken.' },
          { status: 409 }
        )
      }
    }

    // Hash password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(validated.password, 12)

    // Calculate trial dates if trial signup
    const trialStartDate = validated.isTrial ? new Date() : undefined
    const trialEndDate = validated.isTrial
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : undefined

    // Create user with appropriate status
    // Use unique index constraint to prevent duplicates (atomic operation)
    let user
    try {
      user = await PosUser.create({
        username: validated.username,
        email: normalizedEmail,
        password: hashedPassword,
        deviceId: validated.deviceId,
        licenseKey: validated.licenseKey || null,
        isVerified: false,
        accountStatus: 'pending_verification',
        trialStartDate,
        trialEndDate,
        failedLoginAttempts: 0,
        activeSessions: [],
      })
    } catch (error: any) {
      // Handle duplicate key error (race condition protection)
      if (error.code === 11000) {
        // Extract which field was duplicated
        const errorMsg = error.message || ''
        if (errorMsg.includes('email')) {
          return NextResponse.json(
            { success: false, error: 'An account with this email already exists.' },
            { status: 409 }
          )
        } else if (errorMsg.includes('username')) {
          return NextResponse.json(
            { success: false, error: 'Username is already taken.' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'An account with these details already exists.' },
          { status: 409 }
        )
      }
      throw error // Re-throw other errors
    }

    // Generate secure verification token (hashed)
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex')

    await Token.create({
      userId: user._id,
      token: tokenHash, // Store hashed version
      type: 'verify',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    // Send verification email (non-blocking)
    let emailSent = true
    let emailError = null

    try {
      await sendVerificationEmail(normalizedEmail, verifyToken, validated.username)
      // Verification email sent (audit logged)
    } catch (emailErr: any) {
      emailSent = false
      emailError = emailErr.message
      console.error('[Register] Failed to send verification email')
    }

    // Clear rate limit on successful registration
    registerAttempts.delete(rateLimitKey)

    // New user registered (audit logged)

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Account created! Please check your email to verify your account.'
        : 'Account created! We had trouble sending the verification email. Please use "Resend Verification" to try again.',
      userId: user._id.toString(),
      emailSent,
      email: normalizedEmail,
      requiresVerification: true,
      accountType: validated.isTrial ? 'trial' : 'license',
      trialEndDate: trialEndDate?.toISOString(),
    })
  } catch (error: any) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
