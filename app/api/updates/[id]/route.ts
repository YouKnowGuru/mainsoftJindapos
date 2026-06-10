import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import Update from '@/lib/models/Update'
import { authOptions } from '@/lib/auth/auth.config'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

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
