import { NextRequest, NextResponse } from 'next/server'
import { getDownloadUrl, getPublicDownloadUrl } from '@/lib/s3/s3-client'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

// GET /api/download - Get download URL for installer
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type') || 'setup'

    let key: string
    let filename: string

    switch (type) {
      case 'portable':
        key = 'portable.exe'
        filename = 'DhisumTseyig-Portable.exe'
        break
      case 'setup':
      default:
        key = 'setup.exe'
        filename = 'DhisumTseyig-Setup.exe'
        break
    }

    // Generate presigned URL for download
    const downloadUrl = await getDownloadUrl(key, 3600) // 1 hour expiry

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      type,
    })
  } catch (error) {
    console.error('Download URL error:', error)
    
    // Fallback to public URL if presigned URL fails
    try {
      const searchParams = req.nextUrl.searchParams
      const type = searchParams.get('type') || 'setup'
      const key = type === 'portable' ? 'portable.exe' : 'setup.exe'
      const filename = type === 'portable' ? 'DhisumTseyig-Portable.exe' : 'DhisumTseyig-Setup.exe'
      
      const publicUrl = getPublicDownloadUrl(key)
      
      return NextResponse.json({
        success: true,
        downloadUrl: publicUrl,
        filename,
        type,
      })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }
  }
}
