import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { invalidateSucursalSessions } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { checkIPBlock, registerFailedAttempt, registerSuccessfulLogin, logSecurity, clearAllBlocks } from '../middleware/security.js'

const router = Router()

// POST /api/auth/login
router.post('/login', checkIPBlock, (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    const normalize = s => s.replace(/@ft\.com$/i, '').toLowerCase()
    const authUser = db.prepare(`
      SELECT * FROM users_auth WHERE LOWER(REPLACE(email, '@ft.com', '')) = ?
    `).get(normalize(email))

    if (!authUser || authUser.password !== password) {
      registerFailedAttempt(req)
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(authUser.id)
    if (!profile) {
      return res.status(401).json({ error: 'Perfil no encontrado' })
    }

    let sucursal = null
    if (profile.sucursal_id) {
      sucursal = db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(profile.sucursal_id)
    }

    const userId          = authUser.id
    const nombre          = profile.nombre
    const rol             = profile.rol
    const sucursal_id     = profile.sucursal_id || null
    const sucursal_nombre = sucursal?.nombre || null

    const token = jwt.sign(
      { sub: userId, nombre, rol, sucursal_id, sucursal_nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_SISTEMAS }
    )

    registerSuccessfulLogin(req, { id: userId, nombre, rol })

    return res.json({
      token,
      user: { id: userId, nombre, rol, sucursal_id, sucursal_nombre }
    })

  } catch (err) {
    console.error('Error en login:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/auth/sucursal-login
router.post('/sucursal-login', checkIPBlock, (req, res) => {
  const { sucursal_id, password } = req.body
  if (!sucursal_id) return res.status(400).json({ error: 'Sucursal requerida' })
  if (!password)    return res.status(400).json({ error: 'Contraseña requerida' })

  try {
    const sucursal = db.prepare('SELECT * FROM sucursales WHERE id = ?').get(sucursal_id)
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' })
    if (sucursal.password !== password) {
      registerFailedAttempt(req)
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const sucursal_nombre = sucursal.nombre
    const profile = db.prepare("SELECT id FROM profiles WHERE sucursal_id = ? AND rol = 'encargada'").get(sucursal_id)
    const userId = profile?.id || `branch_${sucursal_id}`

    const token = jwt.sign(
      { sub: userId, nombre: sucursal_nombre, rol: 'encargada', sucursal_id, sucursal_nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_SUCURSAL }
    )

    registerSuccessfulLogin(req, { id: userId, nombre: sucursal_nombre, rol: 'encargada' })

    return res.json({ token, user: { id: userId, nombre: sucursal_nombre, rol: 'encargada', sucursal_id, sucursal_nombre } })
  } catch (err) {
    console.error('Error sucursal-login:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
})

// POST /api/auth/cerrar-sesiones-sucursales  (solo admin)
router.post('/cerrar-sesiones-sucursales', authenticate, requireRole('admin'), (req, res) => {
  invalidateSucursalSessions()
  logSecurity('SESSIONS_INVALIDATED', { by: req.user.nombre, rol: req.user.rol })
  return res.json({ ok: true, message: 'Sesiones de sucursales cerradas' })
})

// POST /api/auth/desbloquear-ips  (solo admin)
router.post('/desbloquear-ips', authenticate, requireRole('admin'), (req, res) => {
  const count = clearAllBlocks()
  logSecurity('IPS_UNBLOCKED', { by: req.user.nombre, cleared: count })
  return res.json({ ok: true, message: `${count} registro(s) de bloqueo eliminados` })
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { sub, nombre, rol, sucursal_id, sucursal_nombre } = req.user
  res.json({ id: sub, nombre, rol, sucursal_id, sucursal_nombre })
})

export default router
