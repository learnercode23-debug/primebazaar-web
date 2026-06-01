import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: true, data: user })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' })
  res.cookies.delete('auth-token')
  return res
}
