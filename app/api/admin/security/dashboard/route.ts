import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth.config'
import connectDB from '@/lib/db/mongodb'
import AuditLog from '@/lib/models/AuditLog'
import PosUser from '@/lib/models/PosUser'
import Session from '@/lib/models/Session'
import { Types } from 'mongoose'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import {
  getSecurityAlerts,
  getLoginStats,
  queryAuditLogs,
} from '@/lib/audit/auditLogger'

/**
 * GET /api/admin/security/dashboard
 * Get security dashboard data
 */
export async function GET(req: NextRequest) {
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

    // Apply rate limiting
    const rateLimitResponse = await apiRateLimit(req)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    await connectDB()

    // Get time range from query params
    const hoursParam = req.nextUrl.searchParams.get('hours') || '24'
    const hours = Math.min(Math.max(parseInt(hoursParam, 10) || 24, 1), 168)

    // Gather security metrics
    const [
      securityAlerts,
      loginStats,
      activeSessions,
      activeSessionUsers,
      lockedAccounts,
      failedLogins,
      recentEvents,
    ] = await Promise.all([
      // Recent security alerts
      getSecurityAlerts(hours),

      // Login statistics
      getLoginStats(7), // Last 7 days

      // Active sessions count (total session tokens)
      Session.countDocuments({ isRevoked: false, expiresAt: { $gt: new Date() } }),

      // Unique users with active sessions
      Session.distinct('userId', { isRevoked: false, expiresAt: { $gt: new Date() } }),

      // Locked accounts
      PosUser.countDocuments({
        lockedUntil: { $gt: new Date() },
      }),

      // Failed login attempts in last hour
      AuditLog.countDocuments({
        eventType: 'login_failure',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      }),

      // Recent audit events
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'username email')
        .lean(),
    ])

    // Calculate metrics
    const totalAlerts = securityAlerts.length
    const criticalAlerts = securityAlerts.filter(a => a.severity === 'critical').length
    const warningAlerts = securityAlerts.filter(a => a.severity === 'warning').length

    const loginSuccessCount = loginStats.find(s => s._id === 'login_success')?.count || 0
    const loginFailureCount = loginStats.find(s => s._id === 'login_failure')?.count || 0
    const loginSuccessRate = loginSuccessCount + loginFailureCount > 0
      ? Math.round((loginSuccessCount / (loginSuccessCount + loginFailureCount)) * 100)
      : 100

    // Top failing IPs (potential attacks)
    const topFailingIps = await AuditLog.aggregate([
      {
        $match: {
          eventType: 'login_failure',
          createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          lastAttempt: { $max: '$createdAt' },
          emails: { $addToSet: '$email' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    // Suspicious user activity
    const suspiciousUsers = await AuditLog.aggregate([
      {
        $match: {
          severity: { $in: ['warning', 'critical'] },
          createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          events: { $push: '$eventType' },
          lastEvent: { $max: '$createdAt' },
        },
      },
      { $match: { eventCount: { $gte: 3 } } },
      { $sort: { eventCount: -1 } },
      { $limit: 10 },
    ])

    // Get user details for suspicious users
    const suspiciousUserIds = suspiciousUsers
      .filter(u => u._id)
      .map(u => new Types.ObjectId(u._id))

    const suspiciousUserDetails = await PosUser.find(
      { _id: { $in: suspiciousUserIds } },
      { username: 1, email: 1, accountStatus: 1 }
    ).lean()

    const suspiciousUsersWithDetails = suspiciousUsers.map(u => {
      const userDetail = suspiciousUserDetails.find(
        ud => (ud as any)._id.toString() === u._id?.toString()
      )
      return {
        ...u,
        user: userDetail,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalAlerts,
          criticalAlerts,
          warningAlerts,
          activeSessions,
          activeSessionUsers: activeSessionUsers.length, // Unique users with active sessions
          lockedAccounts,
          failedLoginsLastHour: failedLogins,
          loginSuccessRate,
          totalLoginsLast7Days: loginSuccessCount + loginFailureCount,
        },
        alerts: securityAlerts.slice(0, 20),
        topFailingIps,
        suspiciousUsers: suspiciousUsersWithDetails,
        recentEvents: recentEvents.map(e => ({
          ...e,
          userId: e.userId?._id?.toString() || e.userId,
          user: e.userId,
        })),
      },
    })
  } catch (error: any) {
    console.error('Security dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load security dashboard' },
      { status: 500 }
    )
  }
}
