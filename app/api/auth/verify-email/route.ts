import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { createSession, getTokenExpiryTimes } from '@/lib/auth/tokens'

/**
 * Hash token for comparison
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * POST /api/auth/verify-email
 * Verify email with token from API request
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, deviceId, deviceInfo } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Hash the provided token for comparison
    const tokenHash = hashToken(token)

    // Find token by hash
    const tokenDoc = await Token.findOne({
      token: tokenHash,
      type: 'verify',
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) {
      // Check if token exists but is expired
      const expiredToken = await Token.findOne({
        token: tokenHash,
        type: 'verify',
      })

      if (expiredToken) {
        await Token.deleteOne({ _id: expiredToken._id })
        return NextResponse.json(
          { success: false, error: 'Verification link has expired. Please request a new one.' },
          { status: 410 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Invalid verification link.' },
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

    // Check if already verified
    if (user.isVerified) {
      await Token.deleteMany({ userId: user._id, type: 'verify' })
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Account is already verified.',
      })
    }

    // Mark user as verified
    const verifiedAt = new Date()
    const accountStatus = user.accountStatus === 'pending_verification'
      ? (user.trialEndDate ? 'trial' : 'active')
      : user.accountStatus

    await PosUser.findByIdAndUpdate(user._id, {
      $set: {
        isVerified: true,
        verifiedAt,
        accountStatus,
      },
    })

    // Delete all verification tokens for this user
    await Token.deleteMany({ userId: user._id, type: 'verify' })

    // Email verified (audit logged)

    // Create session automatically after verification
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const tokens = await createSession(
      user._id.toString(),
      deviceId || user.deviceId,
      deviceInfo,
      clientIp,
      userAgent
    )

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      },
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isVerified: true,
        accountStatus,
        trialEndDate: user.trialEndDate,
      },
      tokenExpiry: getTokenExpiryTimes(),
    })
  } catch (error: any) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/verify-email
 * Verify email via direct browser link
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Hash the token for lookup
    const tokenHash = hashToken(token)

    const tokenDoc = await Token.findOne({
      token: tokenHash,
      type: 'verify',
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) {
      const expiredToken = await Token.findOne({
        token: tokenHash,
        type: 'verify',
      })

      if (expiredToken) {
        await Token.deleteOne({ _id: expiredToken._id })
        return NextResponse.json(
          { success: false, error: 'Verification link has expired.' },
          { status: 410 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Invalid verification link.' },
        { status: 400 }
      )
    }

    const user = await PosUser.findById(tokenDoc.userId)
    if (!user) {
      await Token.deleteOne({ _id: tokenDoc._id })
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404 }
      )
    }

    if (user.isVerified) {
      await Token.deleteMany({ userId: user._id, type: 'verify' })
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Account is already verified.',
      })
    }

    const accountStatus = user.accountStatus === 'pending_verification'
      ? (user.trialEndDate ? 'trial' : 'active')
      : user.accountStatus

    await PosUser.findByIdAndUpdate(user._id, {
      $set: {
        isVerified: true,
        verifiedAt: new Date(),
        accountStatus,
      },
    })

    await Token.deleteMany({ userId: user._id, type: 'verify' })

    // Email verified (audit logged)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    })
  } catch (error: any) {
    console.error('GET Verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed.' },
      { status: 500 }
    )
  }
}
