import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import { generateToken } from '@/lib/auth/jwt'
import { z } from 'zod'
import { csrfProtection } from '@/lib/middleware/csrf'

// Simple in-memory rate limiter (use Redis in production)
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = 5 // 5 attempts
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)

  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (attempts.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  attempts.count++
  return { allowed: true, remaining: RATE_LIMIT - attempts.count }
}

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128) // Max password length
})

export async function POST(req: NextRequest, res: NextResponse) {
  // Apply CSRF protection
  const result = await csrfProtection(req, res, async () => {
    try {
      // Get IP for rate limiting
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 req.headers.get('x-real-ip') ||
                 'unknown'

      // Check rate limit
      const rateLimit = checkRateLimit(ip)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, message: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        )
      }

      const body = await req.json()
      const validated = loginSchema.parse(body)

      await connectDB()

      const user = await PosUser.findOne({ email: validated.email })

      if (!user) {
        // Generic error message to prevent user enumeration
        return NextResponse.json(
          { success: false, message: 'Authentication failed' },
          { status: 401 }
        )
      }

      const isPasswordValid = await bcrypt.compare(validated.password, user.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: 'Authentication failed' },
          { status: 401 }
        )
      }

      if (!user.isVerified) {
        return NextResponse.json(
          { success: false, message: 'Email verification required', needsVerification: true },
          { status: 403 }
        )
      }

      // Clear rate limit on successful login
      loginAttempts.delete(ip)

      const token = generateToken(user._id.toString(), user.email)

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          isVerified: user.isVerified
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 500 }
      )
    }
  })

  if (result) {
    return result
  } else {
    return NextResponse.json(
      { success: false, message: 'CSRF protection failed' },
      { status: 403 }
    )
  }
}
