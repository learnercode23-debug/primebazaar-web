'use client'
/**
 * RealtimeSync — invisible client component that opens a Socket.IO connection
 * and calls router.refresh() whenever the server broadcasts a relevant event.
 *
 * router.refresh() is the Next.js App Router way to re-run server components
 * without a full page reload, so data updates appear instantly everywhere.
 */

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Routes that actually render product data. A 'product:updated' broadcast only
// needs to refresh the current route when the user is looking at one of these.
const PRODUCT_ROUTE_PREFIXES = [
  '/products',
  '/deals',
  '/brand',
  '/renewed',
  '/fresh',
  '/digital',
]

function isProductRoute(pathname: string) {
  return (
    pathname === '/' ||
    PRODUCT_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  )
}

export default function RealtimeSync() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  // Keep the latest pathname in a ref so the socket handler (registered once per
  // login) always sees the current route without re-connecting on navigation.
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    // Dynamic import keeps socket.io-client out of the server bundle entirely
    let socket: ReturnType<typeof import('socket.io-client')['io']> | null = null

    import('socket.io-client').then(({ io }) => {
      socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
      })

      socket.on('connect', () => {
        // Join the user's private room so we receive targeted events
        if (user?._id) socket!.emit('join', user._id)
      })

      // Re-join after reconnect (e.g. server restart)
      socket.on('reconnect', () => {
        if (user?._id) socket!.emit('join', user._id)
      })

      // Each event triggers router.refresh() — Next.js re-fetches all server
      // component data for the current route without a full page reload.
      socket.on('order:updated',    () => router.refresh())
      socket.on('order:new',        () => router.refresh())
      socket.on('notification:new', () => router.refresh())
      // Only refresh for product updates when the current route renders product
      // data — otherwise this flickers unrelated pages for no visible benefit.
      socket.on('product:updated',  () => {
        if (isProductRoute(pathnameRef.current)) router.refresh()
      })
    })

    return () => {
      socket?.disconnect()
    }
  // Re-run only when user id changes (login/logout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id])

  // No UI — purely a side-effect component
  return null
}
