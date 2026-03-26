import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { isMock, supabaseAuth, supabase } from '../lib/supabase.js'
import { getStore } from '../data/mock.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    let userId, nombre, rol, sucursal_id, sucursal_nombre

    if (isMock) {
      const store = getStore()

      // Buscar en users_auth
      const authUser = store.users_auth.find(
        u => u.email === email && u.password === password
      )
      if (!authUser) {
        return res.status(401).json({ error: 'Credenciales incorrectas' })
      }

      // Buscar profile
      const profile = store.profiles.find(p => p.id === authUser.id)
      if (!profile) {
        return res.status(401).json({ error: 'Perfil no encontrado' })
      }

      // Buscar sucursal si aplica
      let sucursal = null
      if (profile.sucursal_id) {
        sucursal = store.sucursales.find(s => s.id === profile.sucursal_id) || null
      }

      userId         = authUser.id
      nombre         = profile.nombre
      rol            = profile.rol
      sucursal_id    = profile.sucursal_id || null
      sucursal_nombre = sucursal?.nombre || null

    } else {
      // Supabase real
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
      if (error || !data.user) {
        return res.status(401).json({ error: 'Credenciales incorrectas' })
      }

      // Buscar profile con service role key
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, sucursales(nombre)')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        return res.status(401).json({ error: 'Perfil no encontrado' })
      }

      userId         = data.user.id
      nombre         = profile.nombre
      rol            = profile.rol
      sucursal_id    = profile.sucursal_id || null
      sucursal_nombre = profile.sucursales?.nombre || null
    }

    // Emitir JWT propio
    const token = jwt.sign(
      { sub: userId, nombre, rol, sucursal_id, sucursal_nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    return res.json({
      token,
      user: { id: userId, nombre, rol, sucursal_id, sucursal_nombre }
    })

  } catch (err) {
    console.error('Error en login:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  // req.user tiene el payload del JWT
  const { sub, nombre, rol, sucursal_id, sucursal_nombre } = req.user
  res.json({ id: sub, nombre, rol, sucursal_id, sucursal_nombre })
})

export default router
