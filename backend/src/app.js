import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.routes.js'
import ticketsRoutes from './routes/tickets.routes.js'
import sucursalesRoutes from './routes/sucursales.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'
import catalogosRoutes from './routes/catalogos.routes.js'
import notificacionesRoutes from './routes/notificaciones.routes.js'
import sugerenciasRoutes from './routes/sugerencias.routes.js'
import exportarRoutes from './routes/exportar.routes.js'
import adjuntosRoutes from './routes/adjuntos.routes.js'

const app = express()
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:4173']

// Seguridad HTTP headers
app.use(helmet())

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '500kb' }))

// Rate limit general
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GENERAL),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta de nuevo en un minuto.' }
})

// Rate limit para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.' }
})

// Rate limit para creación de tickets
const ticketCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_TICKETS),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados reportes creados. Espera un momento.' }
})

// Rate limit para escritura (comentarios, etc): 10 por minuto
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de escritura. Espera un momento.' }
})

app.use('/api', (req, res, next) => {
  // Excluir health y auth del rate limit general
  if (req.path === '/health' || req.path.startsWith('/auth/')) return next()
  return generalLimiter(req, res, next)
})
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/sucursal-login', loginLimiter)
app.use('/api/tickets', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/') return ticketCreateLimiter(req, res, next)
  if (req.method === 'POST') return writeLimiter(req, res, next)
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketsRoutes)
app.use('/api/sucursales', sucursalesRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/catalogos', catalogosRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api/sugerencias', sugerenciasRoutes)
app.use('/api/exportar', exportarRoutes)
app.use('/api/adjuntos', adjuntosRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))

export { app }
