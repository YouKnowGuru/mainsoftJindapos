import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import Update from '@/lib/models/Update'
import { authOptions } from '@/lib/auth/auth.config'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

// GET /api/updates/[id] - Get single update (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    await connectDB()
    const update = await Update.findById(id).lean()

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    return NextResponse.json({ update })
  } catch (error) {
    console.error('Get update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/updates/[id] - Full edit (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json()
    await connectDB()

    const update = await Update.findByIdAndUpdate(
      id,
      {
        version: body.version,
        notes: body.notes,
        downloadUrl: body.downloadUrl,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        fileSha512: body.fileSha512,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
      },
      { new: true }
    )

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, update })
  } catch (error) {
    console.error('Put update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/updates/[id] - Update status (publish, block, rollback) (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
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

    const body = await req.json()
    const { status, isLatest, rolloutPercent, forced } = body

    await connectDB()

    // If setting this as latest, unset all others first
    if (isLatest === true) {
      await Update.updateMany({}, { isLatest: false })
    }

    const update = await Update.findByIdAndUpdate(
      id,
      {
        ...(status !== undefined && { status }),
        ...(isLatest !== undefined && { isLatest }),
        ...(rolloutPercent !== undefined && { rolloutPercent }),
        ...(forced !== undefined && { forced }),
      },
      { new: true }
    )

    if (!update) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Update status changed successfully',
      update: {
        id: update._id,
        version: update.version,
        status: update.status,
        isLatest: update.isLatest,
      },
    })
  } catch (error) {
    console.error('Patch update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/updates/[id] - Delete update (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;
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

        const update = await Update.findByIdAndDelete(id)

        if (!update) {
            return NextResponse.json(
                { error: 'Update not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Update deleted successfully',
        })
    } catch (error) {
        console.error('Delete update error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
