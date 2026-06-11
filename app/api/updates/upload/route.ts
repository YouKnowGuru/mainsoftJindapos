import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { writeFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
import path from 'path'
import { authOptions } from '@/lib/auth/auth.config'

export const dynamic = 'force-dynamic'

// POST /api/updates/upload - Upload installer file
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const version = formData.get('version') as string

    if (!file || !version) {
      return NextResponse.json({ error: 'File and version required' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.exe')) {
      return NextResponse.json({ error: 'Only .exe files allowed' }, { status: 400 })
    }

    // Create uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'downloads')
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const fileName = `Jinda.Setup.${version}.exe`
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Generate file URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jindapos.com'
    const fileUrl = `${baseUrl}/downloads/${fileName}`

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
