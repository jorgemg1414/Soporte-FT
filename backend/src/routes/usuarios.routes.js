import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(requireRole('admin'))

// ─── GET /api/usuarios ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      const profiles = store.profiles
        .slice()
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(p => ({
          ...p,
          sucursales: store.sucursales.find(s => s.id === p.sucursal_id) || null
        }))
      return res.json(profiles)
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, sucursales(nombre)')
      .order('nombre')

    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getUsuarios:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ─── POST /api/usuarios ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, rol, sucursal_id } = req.body

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' })
    }

    if (isMock) {
      const store = getStore()

      // Verificar que el email no exista ya
      const exists = store.users_auth.find(u => u.email === email)
      if (exists) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
      }

      const newId = genId()

      store.users_auth.push({
        id:       newId,
        email,
        password
      })

      const newProfile = {
        id:          newId,
        nombre,
        rol,
        sucursal_id: sucursal_id || null,
        email
      }
      store.profiles.push(newProfile)
      saveStore(store)

      const sucursal = sucursal_id
        ? store.sucursales.find(s => s.id === sucursal_id) || null
        : null

      return res.status(201).json({ ...newProfile, sucursales: sucursal })
    }

    // Supabase: crear usuario en auth con service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) throw authError

    const newUserId = authData.user.id

    // Insertar profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:          newUserId,
        nombre,
        rol,
        sucursal_id: sucursal_id || null,
        email
      })
      .select('*, sucursales(nombre)')
      .single()

    if (profileError) throw profileError

    return res.status(201).json(profile)

  } catch (err) {
    console.error('Error createUsuario:', err)
    res.status(500).json({ error: err.message || 'Error al crear el usuario' })
  }
})

// ─── PUT /api/usuarios/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, rol, sucursal_id } = req.body

    if (!nombre || !rol) {
      return res.status(400).json({ error: 'Nombre y rol son requeridos' })
    }

    if (isMock) {
      const store = getStore()
      const idx   = store.profiles.findIndex(p => p.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' })

      store.profiles[idx] = {
        ...store.profiles[idx],
        nombre,
        rol,
        sucursal_id: sucursal_id || null
      }
      saveStore(store)

      const sucursal = sucursal_id
        ? store.sucursales.find(s => s.id === sucursal_id) || null
        : null

      return res.json({ ...store.profiles[idx], sucursales: sucursal })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ nombre, rol, sucursal_id: sucursal_id || null })
      .eq('id', id)
      .select('*, sucursales(nombre)')
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error updateUsuario:', err)
    res.status(500).json({ error: 'Error al actualizar el usuario' })
  }
})

export default router
