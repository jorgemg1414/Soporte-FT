import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// ─── GET /api/sucursales (público — solo id y nombre, sin contraseña) ────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      const sucursales = [...store.sucursales]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(({ id, nombre }) => ({ id, nombre }))
      return res.json(sucursales)
    }

    const { data, error } = await supabase
      .from('sucursales')
      .select('id, nombre')
      .order('nombre')

    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getSucursales:', err)
    res.status(500).json({ error: 'Error al obtener sucursales' })
  }
})

// ─── POST /api/sucursales ────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, email } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    if (isMock) {
      const store = getStore()
      const newSuc = {
        id:         genId(),
        nombre:     nombre.trim().toUpperCase(),
        password:   process.env.MOCK_PASSWORD_SUCURSALES,
        email:      email?.trim() || '',
        created_at: new Date().toISOString()
      }
      store.sucursales.push(newSuc)
      saveStore(store)
      const { password: _, ...safe } = newSuc
      return res.status(201).json(safe)
    }

    const { data, error } = await supabase
      .from('sucursales')
      .insert({ nombre: nombre.trim().toUpperCase() })
      .select()
      .single()

    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error createSucursal:', err)
    res.status(500).json({ error: 'Error al crear la sucursal' })
  }
})

// ─── PUT /api/sucursales/password-todas (solo admin) ──────────────────────────
// IMPORTANT: Must be before /:id routes to avoid Express matching "password-todas" as :id
router.put('/password-todas', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })
    }

    if (isMock) {
      const store = getStore()
      store.sucursales.forEach(s => { s.password = password })
      saveStore(store)
      return res.json({ ok: true, message: `Contraseña actualizada en ${store.sucursales.length} sucursales` })
    }

    const { error } = await supabase
      .from('sucursales')
      .update({ password })
      .neq('id', '')

    if (error) throw error
    return res.json({ ok: true, message: 'Contraseña actualizada en todas las sucursales' })

  } catch (err) {
    console.error('Error cambiarPasswordTodas:', err)
    res.status(500).json({ error: 'Error al cambiar las contraseñas' })
  }
})

// ─── PUT /api/sucursales/:id ─────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, email } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    if (isMock) {
      const store = getStore()
      const idx   = store.sucursales.findIndex(s => s.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Sucursal no encontrada' })

      store.sucursales[idx] = { ...store.sucursales[idx], nombre: nombre.trim().toUpperCase(), email: email?.trim() || '' }
      saveStore(store)
      const { password: _, ...safe } = store.sucursales[idx]
      return res.json(safe)
    }

    const { data, error } = await supabase
      .from('sucursales')
      .update({ nombre: nombre.trim().toUpperCase() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error updateSucursal:', err)
    res.status(500).json({ error: 'Error al actualizar la sucursal' })
  }
})

// ─── PUT /api/sucursales/:id/password (solo admin) ────────────────────────────
router.put('/:id/password', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })
    }

    if (isMock) {
      const store = getStore()
      const idx = store.sucursales.findIndex(s => s.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Sucursal no encontrada' })

      store.sucursales[idx].password = password
      saveStore(store)
      return res.json({ ok: true, message: 'Contraseña actualizada' })
    }

    const { error } = await supabase
      .from('sucursales')
      .update({ password })
      .eq('id', id)

    if (error) throw error
    return res.json({ ok: true, message: 'Contraseña actualizada' })

  } catch (err) {
    console.error('Error cambiarPassword:', err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

// ─── DELETE /api/sucursales/:id ──────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const store = getStore()
      const idx   = store.sucursales.findIndex(s => s.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Sucursal no encontrada' })

      store.sucursales.splice(idx, 1)
      saveStore(store)
      return res.json({ ok: true })
    }

    const { error } = await supabase
      .from('sucursales')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ ok: true })

  } catch (err) {
    console.error('Error deleteSucursal:', err)
    res.status(500).json({ error: 'Error al eliminar la sucursal' })
  }
})

export default router
