import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting to prevent email enumeration abuse
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const email = req.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await PosUser.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      isVerified: user.isVerified === true,
    })
  } catch (error) {
    console.error('[Auth Status] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
