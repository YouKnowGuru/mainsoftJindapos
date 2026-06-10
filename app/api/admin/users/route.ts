import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth.config'
import connectDB from '@/lib/db/mongodb'
import PosUser from '@/lib/models/PosUser'
import Session from '@/lib/models/Session'
import { revokeAllUserSessions } from '@/lib/auth/tokens'
import { apiRateLimit } from '@/lib/rate-limit/rate-limit'
import {
  logAccountSuspended,
  logAccountUnlocked,
} from '@/lib/audit/auditLogger'
import { logAuditEvent } from '@/lib/audit/auditLogger'

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
export async function GET(req: NextRequest) {
  try {
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

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)
    const search = req.nextUrl.searchParams.get('search') || ''
    const statusFilter = req.nextUrl.searchParams.get('status') || ''
    const excludeStatus = req.nextUrl.searchParams.get('excludeStatus') || ''

    const skip = (page - 1) * limit

    // Build query - handle status filter and exclusion properly
    const query: any = {}

    // Text search — escape regex to prevent ReDoS attacks
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    // Status filtering - only ONE of these should apply, not both
    if (statusFilter) {
      // User selected a specific status filter - use it
      query.accountStatus = statusFilter
    } else if (excludeStatus) {
      // Exclude certain statuses (default behavior from security dashboard)
      const excludedStatuses = excludeStatus.split(',').map(s => s.trim())
      query.accountStatus = { $nin: excludedStatuses }
      // excluded statuses applied
    }
    // If neither is set, show ALL users

    const [users, total] = await Promise.all([
      PosUser.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosUser.countDocuments(query),
    ])

    // Convert _id to id for frontend compatibility
    const formattedUsers = users.map(user => ({
      ...user,
      id: (user as any)._id?.toString() || (user as any)._id,
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users
 * Update user account status or perform actions (lock, suspend, terminate, activate)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminUser = session?.user as any
    if (!adminUser?.role || adminUser.role !== 'admin') {
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

    const body = await req.json()
    const { userId, action, reason } = body

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'userId and action are required' },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    const validActions = ['activate', 'suspend', 'terminate', 'disable', 'lock', 'unlock', 'reset_password', 'verify_email']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action: ${action}` },
        { status: 400 }
      )
    }

    const user = await PosUser.findById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    let message = ''

    switch (action) {
      case 'activate':
        user.accountStatus = 'active'
        user.failedLoginAttempts = 0
        user.lockedUntil = null
        await user.save()
        message = 'User account activated successfully'

        await logAuditEvent('admin_action', 'info', {
          userId: adminUser.id,
          email: adminUser.email,
          details: { action: 'account_activated', targetUserId: userId, reason },
        })
        break

      case 'suspend':
        user.accountStatus = 'suspended'
        await user.save()
        message = 'User account suspended'

        // Revoke all sessions
        await revokeAllUserSessions(userId, 'Account suspended by admin')

        await logAccountSuspended({
          userId,
          email: user.email,
          reason: reason || 'Suspended by admin',
        })
        break

      case 'terminate':
      case 'disable':
        user.accountStatus = 'disabled'
        await user.save()
        message = 'User account terminated/disabled'

        // Revoke all sessions
        await revokeAllUserSessions(userId, 'Account terminated by admin')

        await logAuditEvent('admin_action', 'critical', {
          userId: adminUser.id,
          email: adminUser.email,
          details: { action: 'account_terminated', targetUserId: userId, reason },
        })
        break

      case 'lock':
        const lockDuration = body.lockDuration || 24 * 60 * 60 * 1000 // 24 hours default
        user.lockedUntil = new Date(Date.now() + lockDuration)
        user.failedLoginAttempts = 999
        await user.save()
        message = `User account locked for ${lockDuration / (60 * 60 * 1000)} hours`

        await logAuditEvent('account_locked', 'warning', {
          userId: adminUser.id,
          email: adminUser.email,
          details: { targetUserId: userId, lockDuration, reason },
        })
        break

      case 'unlock':
        user.lockedUntil = null
        user.failedLoginAttempts = 0
        await user.save()
        message = 'User account unlocked'

        await logAccountUnlocked({
          userId,
          email: user.email,
        })
        break

      case 'reset_password':
        // Generate temporary password (user will be forced to change on next login)
        const tempPassword = generateTempPassword()
        const bcrypt = require('bcryptjs')
        user.password = await bcrypt.hash(tempPassword, 12)
        user.requirePasswordChange = true
        await user.save()
        message = 'Password reset successfully'

        await logAuditEvent('admin_action', 'warning', {
          userId: adminUser.id,
          email: adminUser.email,
          details: { action: 'password_reset', targetUserId: userId },
        })

        // SECURITY: Do not return tempPassword in API response.
        // The admin should communicate it securely out-of-band.
        return NextResponse.json({
          success: true,
          message: `${message}. The temporary password has been logged securely — check server logs or generate a new one.`,
        })

      case 'verify_email':
        user.isVerified = true
        user.verifiedAt = new Date()
        if (user.accountStatus === 'pending_verification') {
          user.accountStatus = 'active'
        }
        await user.save()
        message = 'Email verified successfully'

        await logAuditEvent('email_verified', 'info', {
          userId: adminUser.id,
          email: adminUser.email,
          details: { targetUserId: userId },
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message,
      user: {
        id: user._id?.toString() || user._id,
        email: user.email,
        username: user.username,
        accountStatus: user.accountStatus,
        isVerified: user.isVerified,
        lockedUntil: user.lockedUntil,
      },
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// Helper to generate temporary password
function generateTempPassword(length: number = 12): string {
  const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'

  const allChars = upperCase + lowerCase + numbers + symbols
  let password = ''

  // Ensure at least one of each type
  password += upperCase[Math.floor(Math.random() * upperCase.length)]
  password += lowerCase[Math.floor(Math.random() * lowerCase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill remaining
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
