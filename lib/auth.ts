import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { connectDB } from './mongodb'
import User, { IUser } from '@/models/User'

const JWT_SECRET = process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET env variable is not set') })()
    : 'dev-only-secret-not-for-production')

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
  } catch {
    return null
  }
}

export async function getAuthUser(req: NextRequest): Promise<IUser | null> {
  const token =
    req.cookies.get('auth-token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  await connectDB()
  const user = await User.findById(decoded.userId).select('-password')
  return user
}

export function requireAuth(role?: 'seller' | 'admin') {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req)
    if (!user) return { error: 'Unauthorized', status: 401 }
    if (role && user.role !== role && user.role !== 'admin') {
      return { error: 'Forbidden', status: 403 }
    }
    return { user }
  }
}
