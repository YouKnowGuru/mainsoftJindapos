import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import License from '@/lib/models/License'
import { authOptions } from '@/lib/auth/auth.config'
import { extendLicenseSchema } from '@/lib/validation/schemas'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'

// POST /api/admin/licenses/extend - Extend license expiry
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Apply rate limiting
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = extendLicenseSchema.parse(body)

    await connectDB()

    const license = await License.findById(validatedData.id)

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      )
    }

    // Calculate new expiry date
    const currentExpiry = license.expiryDate
      ? new Date(license.expiryDate)
      : new Date()
    
    // If already expired, start from today
    const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry
    const newExpiryDate = new Date(baseDate)
    newExpiryDate.setDate(newExpiryDate.getDate() + validatedData.days)

    license.expiryDate = newExpiryDate
    
    // If license was expired, reactivate it
    if (license.status === 'expired') {
      license.status = 'active'
    }

    await license.save()

    return NextResponse.json({
      success: true,
      message: `License extended by ${validatedData.days} days`,
      license: {
        id: license._id,
        licenseKey: license.licenseKey,
        expiryDate: license.expiryDate,
        status: license.status,
      },
    })
  } catch (error) {
    console.error('Extend license error:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
