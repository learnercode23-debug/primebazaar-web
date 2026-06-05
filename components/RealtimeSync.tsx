'use client'
/**
 * RealtimeSync — invisible client component that opens a Socket.IO connection
 * and calls router.refresh() whenever the server broadcasts a relevant event.
 *
 * router.refresh() is the Next.js App Router way to re-run server components
 * without a full page reload, so data updates appear instantly everywhere.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function RealtimeSync() {
  const router = useRouter()
  const { user } = useAuth()

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
      socket.on('product:updated',  () => router.refresh())
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
