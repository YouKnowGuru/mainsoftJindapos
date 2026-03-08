import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import Customer from '@/lib/models/Customer'
import License from '@/lib/models/License'
import { authOptions } from '@/lib/auth/auth.config'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

// GET /api/admin/customers/[id] - Get single customer with licenses
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResponse = apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    await connectDB()

    const customer = await Customer.findById(id)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get customer's licenses
    const licenses = await License.find({ email: customer.email })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      customer,
      licenses,
    })
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/customers/[id] - Delete customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResponse = apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    await connectDB()

    const customer = await Customer.findById(id)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if customer has active licenses
    const activeLicenses = await License.countDocuments({
      email: customer.email,
      status: 'active',
    })

    if (activeLicenses > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with active licenses. Please deactivate licenses first.',
        },
        { status: 400 }
      )
    }

    await Customer.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/customers/[id] - Update customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResponse = apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse and validate request body
    const body = await req.json()
    // We expect the body to contain the updates. ID is in params.

    await connectDB()

    const customer = await Customer.findById(id)
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Update fields
    if (body.name) customer.name = body.name
    if (body.email) customer.email = body.email
    if (body.company !== undefined) customer.company = body.company
    if (body.phone !== undefined) customer.phone = body.phone

    await customer.save()

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      customer,
    })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

