import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import Update from '@/lib/models/Update'
import { authOptions } from '@/lib/auth/auth.config'
import { createUpdateSchema } from '@/lib/validation/schemas'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import { ZodError } from 'zod'

// GET /api/updates - Get all updates (admin only)
export async function GET(req: NextRequest) {
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

    const updates = await Update.find()
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ updates })
  } catch (error) {
    console.error('Get updates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/updates - Create new update (admin only)
export async function POST(req: NextRequest) {
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
    const validatedData = createUpdateSchema.parse(body)

    await connectDB()

    // If this is marked as latest, unset previous latest
    if (validatedData.isLatest) {
      await Update.updateMany({}, { isLatest: false })
    }

    // Create update
    const update = await Update.create({
      version: validatedData.version,
      notes: validatedData.notes,
      downloadUrl: validatedData.downloadUrl,
      isLatest: validatedData.isLatest,
    })

    return NextResponse.json({
      success: true,
      message: 'Update created successfully',
      update: {
        id: update._id,
        version: update.version,
        notes: update.notes,
        downloadUrl: update.downloadUrl,
        isLatest: update.isLatest,
        createdAt: update.createdAt,
      },
    })
  } catch (error) {
    console.error('Create update error:', error)

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
