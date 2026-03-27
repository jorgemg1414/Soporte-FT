import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { isMock, supabaseAuth, supabase } from '../lib/supabase.js'
import db, { invalidateSucursalSessions } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { checkIPBlock, registerFailedAttempt, registerSuccessfulLogin, logSecurity } from '../middleware/security.js'

const router = Router()

// POST /api/auth/login
router.post('/login', checkIPBlock, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    let userId, nombre, rol, sucursal_id, sucursal_nombre

    if (isMock) {
      // SQLite: buscar en users_auth
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

      userId          = authUser.id
      nombre          = profile.nombre
      rol             = profile.rol
      sucursal_id     = profile.sucursal_id || null
      sucursal_nombre = sucursal?.nombre || null

    } else {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      if (error || !data.user) {
        registerFailedAttempt(req)
        return res.status(401).json({ error: 'Credenciales incorrectas' })
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, sucursales(nombre)')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        return res.status(401).json({ error: 'Perfil no encontrado' })
      }

      userId          = data.user.id
      nombre          = profile.nombre
      rol             = profile.rol
      sucursal_id     = profile.sucursal_id || null
      sucursal_nombre = profile.sucursales?.nombre || null
    }

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
router.post('/sucursal-login', checkIPBlock, async (req, res) => {
  const { sucursal_id, password } = req.body
  if (!sucursal_id) return res.status(400).json({ error: 'Sucursal requerida' })
  if (!password)    return res.status(400).json({ error: 'Contraseña requerida' })

  try {
    let sucursal_nombre, userId

    if (isMock) {
      const sucursal = db.prepare('SELECT * FROM sucursales WHERE id = ?').get(sucursal_id)
      if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' })
      if (sucursal.password !== password) {
        registerFailedAttempt(req)
        return res.status(401).json({ error: 'Contraseña incorrecta' })
      }
      sucursal_nombre = sucursal.nombre
      const profile = db.prepare("SELECT id FROM profiles WHERE sucursal_id = ? AND rol = 'encargada'").get(sucursal_id)
      userId = profile?.id || `branch_${sucursal_id}`
    } else {
      const { data: suc, error } = await supabase.from('sucursales').select('nombre, password').eq('id', sucursal_id).single()
      if (error || !suc) return res.status(404).json({ error: 'Sucursal no encontrada' })
      if (suc.password !== password) {
        registerFailedAttempt(req)
        return res.status(401).json({ error: 'Contraseña incorrecta' })
      }
      sucursal_nombre = suc.nombre
      const { data: profile } = await supabase.from('profiles').select('id').eq('sucursal_id', sucursal_id).eq('rol', 'encargada').single()
      userId = profile?.id || `branch_${sucursal_id}`
    }

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

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { sub, nombre, rol, sucursal_id, sucursal_nombre } = req.user
  res.json({ id: sub, nombre, rol, sucursal_id, sucursal_nombre })
})

export default router
