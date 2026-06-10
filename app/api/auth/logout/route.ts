import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import Session from '@/lib/models/Session'
import PosUser from '@/lib/models/PosUser'
import { revokeSession, revokeAllUserSessions, verifyAccessToken } from '@/lib/auth/tokens'
import { z } from 'zod'

const logoutSchema = z.object({
  sessionId: z.string().optional(),
  revokeAll: z.boolean().default(false),
  reason: z.string().optional(),
})

/**
 * POST /api/auth/logout
 * Revoke current session or all sessions
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    const body = await req.json().catch(() => ({}))
    const validated = logoutSchema.parse(body)

    await connectDB()

    let userId: string | null = null
    let currentSessionId: string | null = null

    // Validate access token if provided
    if (accessToken) {
      const payload = verifyAccessToken(accessToken)
      if (payload) {
        userId = payload.userId
        currentSessionId = payload.sessionId
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Revoke session(s)
    if (validated.revokeAll) {
      // Revoke all sessions except current if specified
      const revokedCount = await revokeAllUserSessions(
        userId,
        validated.reason || 'User logout all sessions',
        currentSessionId || undefined
      )

      // Session revocation logged via audit system

      return NextResponse.json({
        success: true,
        message: 'All sessions logged out successfully.',
        revokedSessions: revokedCount,
      })
    } else {
      // Revoke specific session or current session
      const sessionIdToRevoke = validated.sessionId || currentSessionId

      if (!sessionIdToRevoke) {
        return NextResponse.json(
          { success: false, error: 'No session to revoke' },
          { status: 400 }
        )
      }

      const revoked = await revokeSession(
        sessionIdToRevoke,
        validated.reason || 'User logout'
      )

      if (revoked) {
        // Remove from user's active sessions
        await PosUser.findByIdAndUpdate(userId, {
          $pull: { activeSessions: sessionIdToRevoke },
        })

        // Session revocation logged via audit system
      }

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully.',
        sessionRevoked: revoked,
      })
    }
  } catch (error: any) {
    console.error('Logout error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/logout
 * Simple logout endpoint (revokes current session based on token)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    await connectDB()

    const payload = verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { userId, sessionId } = payload

    // Revoke the session
    const revoked = await revokeSession(sessionId, 'User logout')

    if (revoked) {
      await PosUser.findByIdAndUpdate(userId, {
        $pull: { activeSessions: sessionId },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    })
  } catch (error: any) {
    console.error('Logout GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}
