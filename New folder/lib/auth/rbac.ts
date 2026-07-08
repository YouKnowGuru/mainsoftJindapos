import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth/auth.config'

export interface Session {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
  }
}

export function withRole(requiredRole: string) {
  return async function (req: NextRequest, next: Function) {
    try {
      // Get session
      const session = await getServerSession(authOptions) as Session | null
      if (!session) throw new Error('Unauthorized')
      
      // Check user role
      if (session.user?.role !== requiredRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      
      // Proceed to next middleware
      return next()
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}
