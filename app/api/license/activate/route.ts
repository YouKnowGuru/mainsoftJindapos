import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import License from '@/lib/models/License'
import { licenseKeySchema } from '@/lib/validation/schemas'
import { licenseRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = licenseRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = licenseKeySchema.parse(body)

    const { licenseKey, deviceId } = validatedData

    // Connect to database
    await connectDB()

    // Find license
    const license = await License.findOne({ licenseKey: licenseKey.toUpperCase() })

    if (!license) {
      return NextResponse.json(
        {
          success: false,
          message: 'License not found',
        },
        { status: 404 }
      )
    }

    // Check if license is already active on another device
    if (license.deviceId && deviceId && license.deviceId !== deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: 'License is already activated on another device',
        },
        { status: 403 }
      )
    }

    // Check if license is expired
    if (license.expiryDate && new Date(license.expiryDate) < new Date()) {
      license.status = 'expired'
      await license.save()

      return NextResponse.json(
        {
          success: false,
          message: 'License has expired',
        },
        { status: 403 }
      )
    }

    // Check if license is suspended
    if (license.status === 'suspended') {
      return NextResponse.json(
        {
          success: false,
          message: 'License has been suspended',
        },
        { status: 403 }
      )
    }

    // Activate license
    license.status = 'active'
    if (deviceId) {
      license.deviceId = deviceId
    }
    license.activationDate = new Date()
    license.activationCount = (license.activationCount || 0) + 1
    await license.save()

    return NextResponse.json({
      success: true,
      message: 'License activated successfully',
      data: {
        licenseKey: license.licenseKey,
        plan: license.plan,
        status: license.status,
        expiryDate: license.expiryDate ? license.expiryDate.toISOString() : null,
        customerName: license.customerName,
        companyName: license.companyName,
      },
    })
  } catch (error) {
    console.error('License activation error:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
