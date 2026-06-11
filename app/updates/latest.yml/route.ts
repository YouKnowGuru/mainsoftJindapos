import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import connectDB from '@/lib/db/mongodb'
import Update from '@/lib/models/Update'

/**
 * GET /updates/latest.yml
 * Returns electron-updater compatible YAML for Windows NSIS
 * This is what electron-updater fetches to check for updates
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB()

    // Find the latest PUBLISHED update
    const latestUpdate = await Update.findOne({
      isLatest: true,
      status: { $in: ['published', 'rollbacked'] },
    })
      .sort({ createdAt: -1 })
      .lean()

    if (!latestUpdate) {
      // Return 404 so electron-updater knows no update is available
      return new NextResponse('No updates available', { status: 404 })
    }

    // Check if version is blocked
    if (latestUpdate.status === 'blocked') {
      return new NextResponse('Update blocked', { status: 404 })
    }

    // Build YAML content for electron-updater
    // Format: https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/providers/GenericProvider.ts
    const installerFileName = latestUpdate.fileUrl || `Jinda Setup ${latestUpdate.version}.exe`
    const sha512 = latestUpdate.fileSha512 || ''
    const size = latestUpdate.fileSize || 0
    const releaseDate = latestUpdate.releaseDate
      ? new Date(latestUpdate.releaseDate).toISOString()
      : new Date().toISOString()

    const yamlContent = `version: ${latestUpdate.version}
files:
  - url: ${installerFileName}
    sha512: ${sha512}
    size: ${size}
path: ${installerFileName}
sha512: ${sha512}
releaseDate: '${releaseDate}'
`

    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[Updates YAML] Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
