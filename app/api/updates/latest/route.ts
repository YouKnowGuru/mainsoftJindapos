import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import connectDB from '@/lib/db/mongodb'
import Update, { IUpdate } from '@/lib/models/Update'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

// GET /api/updates/latest - Get latest update
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    await connectDB()

    // Find the latest update
    const latestUpdate = await Update.findOne({ isLatest: true })
      .sort({ createdAt: -1 })
      .lean() as IUpdate | null

    if (!latestUpdate) {
      // Return default response if no updates found
      return NextResponse.json({
        version: '1.0.0',
        notes: 'Initial release',
        downloadUrl: 'https://download.dhisumtseyig.com/setup.exe',
        releaseDate: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      version: latestUpdate.version,
      notes: latestUpdate.notes,
      downloadUrl: latestUpdate.downloadUrl,
      releaseDate: latestUpdate.createdAt,
    })
  } catch (error) {
    console.error('Get latest update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
