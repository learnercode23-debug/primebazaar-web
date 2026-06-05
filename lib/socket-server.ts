/**
 * Server-side Socket.IO helpers.
 * Call these from any Next.js API route to push live updates to clients.
 *
 * The `io` instance lives on `global.socketIO` — it's set once in server.js
 * and shared across all API-route invocations in the same Node.js process.
 */

import type { Server } from 'socket.io'

function getIO(): Server | null {
  // `global` is untyped in TypeScript — cast it.
  return (global as unknown as { socketIO?: Server }).socketIO ?? null
}

/**
 * Broadcast to ALL connected clients (product stock changes, price updates, etc.)
 * Everyone is in the 'public' room.
 */
export function emitAll(event: string, data?: unknown) {
  getIO()?.to('public').emit(event, data)
}

/**
 * Send an event to a single user's private room.
 * The client joins this room by emitting  socket.emit('join', userId)  after login.
 */
export function emitToUser(userId: string, event: string, data?: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, data)
}
