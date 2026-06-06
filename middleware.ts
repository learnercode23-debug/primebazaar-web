import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://www.primepasal.com',
  'https://primepasal.com',
  'http://localhost:3000',
  'http://localhost:3002',
]

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':      isAllowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods':     'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':     'Authorization,Content-Type,Cookie',
        'Access-Control-Max-Age':           '86400',
      },
    })
  }

  const res = NextResponse.next()
  if (isAllowed) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return res
}

export const config = {
  matcher: '/api/:path*',
}
