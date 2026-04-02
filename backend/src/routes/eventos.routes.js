import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { addClient, removeClient } from '../lib/broadcaster.js'

const router = Router()

// GET /api/eventos — conexión SSE persistente (requiere auth)
router.get('/', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx: deshabilitar buffering
  res.flushHeaders()

  // Ping inicial para confirmar conexión
  res.write('event: conectado\ndata: {}\n\n')

  addClient(res)

  // Keep-alive cada 25s (evita que proxies/firewalls cierren la conexión)
  const keepAlive = setInterval(() => {
    try { res.write('event: ping\ndata: {}\n\n') }
    catch { clearInterval(keepAlive) }
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    removeClient(res)
  })
})

export default router
