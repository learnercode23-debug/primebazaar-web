/**
 * Custom Node.js server that wraps Next.js and attaches Socket.IO.
 * This gives us one HTTP server that handles both regular HTTP requests
 * (routed through Next.js) and WebSocket connections (Socket.IO).
 *
 * Run with:  node server.js
 * Dev mode:  NODE_ENV=development node server.js   (same as `next dev` but with sockets)
 */

const { createServer } = require('node:http')
const { parse }        = require('node:url')
const next             = require('next')
const { Server }       = require('socket.io')

const dev      = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'   // listen on all interfaces so the phone on the LAN can reach it
const port     = parseInt(process.env.PORT || '3002', 10)

const app    = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // ── 1. HTTP server (Next.js handles all regular requests) ──────────────────
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('[server] Error handling request:', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // ── 2. Socket.IO (attached to the same HTTP server) ───────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: '*',          // restrict to your domains in production
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Store `io` on `global` so any Next.js API route can call emit helpers
  // without needing a separate inter-process channel.
  global.socketIO = io

  io.on('connection', (socket) => {
    // Every client immediately joins the public room for product/price broadcasts.
    socket.join('public')

    // After login, the client sends its userId so we can target it privately.
    // e.g. socket.emit('join', '64abc...')
    socket.on('join', (userId) => {
      if (userId && typeof userId === 'string') {
        socket.join(`user:${userId}`)
      }
    })

    // Cleanup is automatic on disconnect — Socket.IO removes the socket from all rooms.
  })

  // ── 3. Start listening ─────────────────────────────────────────────────────
  httpServer
    .once('error', (err) => {
      console.error('[server] Fatal error:', err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`✅  Next.js ready  → http://localhost:${port}`)
      console.log(`📡  Socket.IO      → ws://localhost:${port}`)
      console.log(`📱  LAN (mobile)   → http://0.0.0.0:${port}`)
    })
})
