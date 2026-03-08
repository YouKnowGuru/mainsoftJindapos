import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth/next'
import connectDB from '@/lib/db/mongodb'
import License from '@/lib/models/License'
import Customer from '@/lib/models/Customer'
import { authOptions } from '@/lib/auth/auth.config'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'

// GET /api/stats - Get dashboard statistics
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

    // Get statistics
    const [
      totalLicenses,
      activeLicenses,
      inactiveLicenses,
      expiredLicenses,
      totalCustomers,
      starterLicenses,
      proLicenses,
      lifetimeLicenses,
    ] = await Promise.all([
      License.countDocuments(),
      License.countDocuments({ status: 'active' }),
      License.countDocuments({ status: 'inactive' }),
      License.countDocuments({ status: 'expired' }),
      Customer.countDocuments(),
      License.countDocuments({ plan: 'starter' }),
      License.countDocuments({ plan: 'pro' }),
      License.countDocuments({ plan: 'lifetime' }),
    ])

    // Get recent licenses
    const recentLicenses = await License.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    // Get licenses expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringSoon = await License.countDocuments({
      status: 'active',
      expiryDate: {
        $lte: thirtyDaysFromNow,
        $gt: new Date(),
      },
    })

    return NextResponse.json({
      stats: {
        totalLicenses,
        activeLicenses,
        inactiveLicenses,
        expiredLicenses,
        totalCustomers,
        starterLicenses,
        proLicenses,
        lifetimeLicenses,
        expiringSoon,
      },
      recentLicenses,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
