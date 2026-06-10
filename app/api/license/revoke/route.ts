import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth.config'
import connectDB from '@/lib/db/mongodb'
import License from '@/lib/models/License'
import { logLicenseRevoked } from '@/lib/audit/auditLogger'

/**
 * POST /api/license/revoke
 * Revoke a license (admin only)
 * 
 * Body:
 * {
 *   licenseKey: string,
 *   reason: 'payment_failed' | 'fraud' | 'user_request' | 'admin_action' | 'terms_violation',
 *   notes?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await req.json()
    const { licenseKey, reason, notes } = body

    if (!licenseKey || !reason) {
      return NextResponse.json(
        { success: false, error: 'licenseKey and reason are required' },
        { status: 400 }
      )
    }

    // Validate reason
    const validReasons = [
      'payment_failed',
      'fraud',
      'user_request',
      'admin_action',
      'terms_violation',
    ]
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      )
    }

    // Find license
    const license = await License.findOne({
      licenseKey: licenseKey.toUpperCase(),
    })

    if (!license) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      )
    }

    // Check if already revoked
    if (license.status === 'revoked') {
      return NextResponse.json(
        { success: false, error: 'License is already revoked' },
        { status: 400 }
      )
    }

    // Store previous status for audit
    const previousStatus = license.status

    // Revoke the license
    license.status = 'revoked'
    license.revokedAt = new Date()
    license.revokedBy = user.email || user.username
    license.revokedReason = reason
    license.revokedNotes = notes || null
    await license.save()

    // Log the revocation
    await logLicenseRevoked({
      email: license.email,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      details: {
        licenseKey: licenseKey.toUpperCase(),
        previousStatus,
        reason,
        notes,
        revokedBy: user.email || user.username,
      },
    })

    console.log(
      `[License Revoked] ${licenseKey.toUpperCase()} by ${user.email || user.username} - Reason: ${reason}`
    )

    return NextResponse.json({
      success: true,
      message: `License ${licenseKey.toUpperCase()} has been revoked`,
      data: {
        licenseKey: licenseKey.toUpperCase(),
        previousStatus,
        revokedAt: license.revokedAt,
        reason,
      },
    })
  } catch (error: any) {
    console.error('License revocation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke license' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/license/revoke/:licenseKey
 * Check revocation status of a license (for POS client polling)
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication for revocation status checks
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.role || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Extract licenseKey from URL pathname: /api/license/revoke/XXXXX
    const pathname = req.nextUrl.pathname
    const licenseKey = pathname.split('/').pop()

    if (!licenseKey || licenseKey === 'revoke') {
      return NextResponse.json(
        { success: false, error: 'License key is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const license = await License.findOne({
      licenseKey: licenseKey.toUpperCase(),
    }).select('licenseKey status revokedAt revokedReason')

    if (!license) {
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        licenseKey: license.licenseKey,
        status: license.status,
        isRevoked: license.status === 'revoked',
        revokedAt: license.revokedAt,
        reason: license.revokedReason,
      },
    })
  } catch (error: any) {
    console.error('License status check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check license status' },
      { status: 500 }
    )
  }
}
