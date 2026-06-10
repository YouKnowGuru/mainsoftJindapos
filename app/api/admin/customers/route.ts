import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import Customer from '@/lib/models/Customer'
import License from '@/lib/models/License'
import { authOptions } from '@/lib/auth/auth.config'
import { createCustomerSchema } from '@/lib/validation/schemas'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'

// GET /api/admin/customers - Get all customers
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

    // Build query
    const query: any = {}

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { company: { $regex: sanitizedSearch, $options: 'i' } },
      ]
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ])

    // Get license count for each customer
    const customersWithLicenses = await Promise.all(
      customers.map(async (customer) => {
        const licenseCount = await License.countDocuments({ email: customer.email })
        return {
          ...customer,
          licenseCount,
        }
      })
    )

    return NextResponse.json({
      customers: customersWithLicenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/customers - Create new customer
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
    const validatedData = createCustomerSchema.parse(body)

    await connectDB()

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email: validatedData.email })
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 409 }
      )
    }

    // Create customer
    const customer = await Customer.create({
      name: validatedData.name,
      email: validatedData.email,
      company: validatedData.company || '',
      phone: validatedData.phone || '',
    })

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        phone: customer.phone,
      },
    })
  } catch (error) {
    console.error('Create customer error:', error)

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
