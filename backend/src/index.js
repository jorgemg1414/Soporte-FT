import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.routes.js'
import ticketsRoutes from './routes/tickets.routes.js'
import sucursalesRoutes from './routes/sucursales.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'
import catalogosRoutes from './routes/catalogos.routes.js'
import notificacionesRoutes from './routes/notificaciones.routes.js'
import sugerenciasRoutes from './routes/sugerencias.routes.js'
import exportarRoutes from './routes/exportar.routes.js'
import { isMock } from './lib/supabase.js'

// Validar variables de entorno requeridas
const requiredEnv = [
  'JWT_SECRET',
  'MOCK_PASSWORD_SUCURSALES', 'MOCK_PASSWORD_ADMIN', 'MOCK_PASSWORD_SOPORTE', 'MOCK_PASSWORD_USUARIOS',
  'JWT_EXPIRES_SISTEMAS', 'JWT_EXPIRES_SUCURSAL',
  'RATE_LIMIT_GENERAL', 'RATE_LIMIT_LOGIN', 'RATE_LIMIT_TICKETS'
]
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`ERROR: ${key} no está definido en .env`)
    process.exit(1)
  }
}

const app = express()
const PORT = process.env.PORT || 3001
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:4173']

// Seguridad HTTP headers
app.use(helmet())

app.use(cors({ origin: allowedOrigins }))
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

app.use('/api', generalLimiter)
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/sucursal-login', loginLimiter)
app.use('/api/tickets', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/') return ticketCreateLimiter(req, res, next)
  if (req.method === 'POST') return writeLimiter(req, res, next) // comentarios
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

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
  console.log(`Modo: ${isMock ? 'MOCK local' : 'Supabase'}`)
})
