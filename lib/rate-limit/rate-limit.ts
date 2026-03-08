import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

export function rateLimit(
  req: NextRequest,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 10 }
): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const key = `${ip}:${req.nextUrl.pathname}`
  const now = Date.now()

  // Clean up expired entries
  if (store[key] && now > store[key].resetTime) {
    delete store[key]
  }

  // Initialize or increment counter
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + options.windowMs,
    }
  } else {
    store[key].count++
  }

  // Check if limit exceeded
  if (store[key].count > options.maxRequests) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((store[key].resetTime - now) / 1000)),
        },
      }
    )
  }

  return null
}

// Specific rate limiters for different endpoints
export function licenseRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  })
}

export function apiRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  })
}

export function authRateLimit(req: NextRequest): NextResponse | null {
  return rateLimit(req, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  })
}
