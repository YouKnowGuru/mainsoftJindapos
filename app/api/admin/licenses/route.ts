import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import License from '@/lib/models/License'
import Customer from '@/lib/models/Customer'
import { authOptions } from '@/lib/auth/auth.config'
import { createLicenseSchema, updateLicenseSchema } from '@/lib/validation/schemas'
import { generateLicenseKey } from '@/lib/utils'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'

/**
 * Sanitize input for use in MongoDB regex to prevent ReDoS attacks
 */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/admin/licenses - Get all licenses
export async function GET(req: NextRequest): Promise<NextResponse> {
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

    await connectDB()

    // Get query parameters
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const plan = searchParams.get('plan')

    // Build query
    const query: any = {}

    if (status) {
      query.status = status
    }

    if (plan) {
      query.plan = plan
    }

    if (search) {
      // Sanitize search input to prevent regex injection/ReDoS
      const sanitizedSearch = escapeRegex(search)
      query.$or = [
        { licenseKey: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { companyName: { $regex: sanitizedSearch, $options: 'i' } },
      ]
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const [licenses, total] = await Promise.all([
      License.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      License.countDocuments(query),
    ])

    return NextResponse.json({
      licenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get licenses error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/licenses - Create new license
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
    const validatedData = createLicenseSchema.parse(body)

    await connectDB()

    // Generate unique license key
    let licenseKey = generateLicenseKey()
    let existingLicense = await License.findOne({ licenseKey })

    // Ensure unique key
    while (existingLicense) {
      licenseKey = generateLicenseKey()
      existingLicense = await License.findOne({ licenseKey })
    }

    // Calculate expiry date based on plan
    let expiryDate = null
    if (validatedData.plan !== 'lifetime' && validatedData.expiryDate) {
      expiryDate = new Date(validatedData.expiryDate)
    } else if (validatedData.plan !== 'lifetime') {
      // Default to 1 year from now
      expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    }

    // Calculate max users based on plan if not provided
    let maxUsers = validatedData.maxUsers
    if (maxUsers === undefined) {
      if (validatedData.plan === 'enterprise') maxUsers = 5
      else if (validatedData.plan === 'growth' || validatedData.plan === 'pro') maxUsers = 2
      else if (validatedData.plan === 'lifetime') maxUsers = 5 // User previously mentioned 5 for lifetime too
      else maxUsers = 1 // starter
    }

    // Create license
    const license = await License.create({
      licenseKey,
      customerName: validatedData.customerName,
      email: validatedData.email,
      companyName: validatedData.companyName || '',
      plan: validatedData.plan,
      maxUsers,
      status: 'inactive',
      expiryDate,
      activationCount: 0,
    })

    // Create or update customer
    await Customer.findOneAndUpdate(
      { email: validatedData.email },
      {
        name: validatedData.customerName,
        email: validatedData.email,
        company: validatedData.companyName || '',
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'License created successfully',
      license: {
        id: license._id,
        licenseKey: license.licenseKey,
        customerName: license.customerName,
        email: license.email,
        plan: license.plan,
        maxUsers: license.maxUsers,
        status: license.status,
        expiryDate: license.expiryDate,
      },
    })
  } catch (error) {
    console.error('Create license error:', error)

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

// PATCH /api/admin/licenses - Update license
export async function PATCH(req: NextRequest): Promise<NextResponse> {
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
    const validatedData = updateLicenseSchema.parse(body)

    await connectDB()

    const updateData: any = {}
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.expiryDate) updateData.expiryDate = new Date(validatedData.expiryDate)
    if (validatedData.maxUsers !== undefined) updateData.maxUsers = validatedData.maxUsers

    const license = await License.findByIdAndUpdate(
      validatedData.id,
      updateData,
      { new: true }
    )

    if (!license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'License updated successfully',
      license,
    })
  } catch (error) {
    console.error('Update license error:', error)

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
