import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Token from '@/lib/models/Token'
import { sendVerificationEmail } from '@/lib/email/email'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
})

/**
 * Hash token for storage and comparison
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    console.log('[Resend] Request received for email:', body.email)

    const validated = resendSchema.parse(body)

    await connectDB()

    // Find user
    const user = await PosUser.findOne({ email: validated.email })
    if (!user) {
      console.log('[Resend] No user found for email:', validated.email)
      // Don't reveal email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a new verification email has been sent.',
      })
    }

    console.log('[Resend] User found:', user.username, '| isVerified:', user.isVerified)

    if (user.isVerified) {
      return NextResponse.json({
        success: true,
        message: 'Account is already verified. You can log in.',
        alreadyVerified: true,
      })
    }

    // Delete existing verify tokens
    await Token.deleteMany({ userId: user._id, type: 'verify' })
    console.log('[Resend] Old tokens cleared for user:', user._id)

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(verifyToken)  // Hash before storing

    await Token.create({
      userId: user._id,
      token: tokenHash,  // Store HASHED token
      type: 'verify',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })
    console.log('[Resend] New verify token created (hashed)')

    // Send email with RAW token (user needs the original to click link)
    try {
      await sendVerificationEmail(validated.email, verifyToken, user.username)
      console.log('[Resend] ✅ Verification email sent to:', validated.email)
    } catch (emailError: any) {
      console.error('[Resend] ❌ SMTP failed for:', validated.email, '-', emailError.message)
      console.error('[Resend] Full SMTP error:', emailError)
      return NextResponse.json(
        { success: false, message: 'Failed to send email. Check SMTP configuration.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'New verification email sent successfully.',
    })
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to resend verification email.' },
      { status: 500 }
    )
  }
}
