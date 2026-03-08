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
          valid: false,
          message: 'License not found',
        },
        { status: 404 }
      )
    }

    // Check if license is active
    if (license.status === 'suspended') {
      return NextResponse.json(
        {
          valid: false,
          message: 'License has been suspended',
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
          valid: false,
          message: 'License has expired',
        },
        { status: 403 }
      )
    }

    // Device locking logic
    let isFirstActivation = false;

    if (!license.deviceId) {
      // 1. First activation - bind device
      if (deviceId) {
        license.deviceId = deviceId;
        license.activationDate = new Date();
        license.activationCount = 1;
        license.status = 'active';
        isFirstActivation = true;
        await license.save();
      } else {
        return NextResponse.json(
          { valid: false, message: 'Device ID required for first activation' },
          { status: 400 }
        );
      }
    } else if (deviceId && license.deviceId === deviceId) {
      // 2. Existing device - check if we need to update status or just increment
      if (license.status === 'inactive' || license.status === 'expired') {
        license.status = 'active';
      }

      // Update activation count (only if not just set to 1 above)
      license.activationCount += 1;
      await license.save();

      // If count is 1 after saving (was just bound), it's first activation
      // BUT we incremented it to 2 if it was already bound.
      // So if it was already bound, isFirstActivation remains false.
    } else if (deviceId && license.deviceId !== deviceId) {
      // 3. Different device trying to activate
      return NextResponse.json(
        { valid: false, message: 'License is already bound to another device' },
        { status: 403 }
      );
    }

    // License is valid
    return NextResponse.json({
      valid: true,
      isFirstActivation, // Now accurately reflects if this specific call bound the device
      plan: license.plan,
      maxUsers: license.maxUsers || 1,
      expiryDate: license.expiryDate ? license.expiryDate.toISOString() : null,
      customerName: license.customerName,
      companyName: license.companyName,
      message: 'License verified successfully',
    });
  } catch (error) {
    console.error('License verification error:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid request data',
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        valid: false,
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for simple checks
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = licenseRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const licenseKey = req.nextUrl.searchParams.get('licenseKey')
    const deviceId = req.nextUrl.searchParams.get('deviceId')

    if (!licenseKey) {
      return NextResponse.json(
        {
          valid: false,
          message: 'License key is required',
        },
        { status: 400 }
      )
    }

    // Validate license key format
    const validatedData = licenseKeySchema.parse({ licenseKey, deviceId: deviceId || undefined })

    // Connect to database
    await connectDB()

    // Find license
    const license = await License.findOne({ licenseKey: validatedData.licenseKey.toUpperCase() })

    if (!license) {
      return NextResponse.json(
        {
          valid: false,
          message: 'License not found',
        },
        { status: 404 }
      )
    }

    // Check if license is active and not expired
    const isExpired = license.expiryDate && new Date(license.expiryDate) < new Date()
    const isActive = license.status === 'active' && !isExpired

    return NextResponse.json({
      valid: isActive,
      status: license.status,
      plan: license.plan,
      maxUsers: license.maxUsers || 1,
      expiryDate: license.expiryDate ? license.expiryDate.toISOString() : null,
      isExpired,
    })
  } catch (error) {
    console.error('License check error:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid license key format',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        valid: false,
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
