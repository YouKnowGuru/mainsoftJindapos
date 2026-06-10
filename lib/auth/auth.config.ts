import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/mongodb'
import Admin from '@/lib/models/Admin'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          await connectDB()

          const admin = await Admin.findOne({ username: credentials.username })

          if (!admin) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            admin.passwordHash
          )

          if (!isValidPassword) {
            return null
          }

          return {
            id: admin._id.toString(),
            username: admin.username,
            email: admin.email || '',
            role: 'admin',
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = (user as any).role || 'admin'
      }
      // Always ensure admin role for logged-in users (fixes stale tokens)
      if (token.username === 'admin' || token.email?.includes('admin')) {
        token.role = 'admin'
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        ;(session.user as any).role = (token.role as string) || 'admin'
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
