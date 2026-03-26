import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// ─── GET /api/sucursales ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      const sucursales = [...store.sucursales].sort((a, b) => a.nombre.localeCompare(b.nombre))
      return res.json(sucursales)
    }

    const { data, error } = await supabase
      .from('sucursales')
      .select('*')
      .order('nombre')

    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getSucursales:', err)
    res.status(500).json({ error: 'Error al obtener sucursales' })
  }
})

// ─── POST /api/sucursales ────────────────────────────────────────────────────
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { nombre } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    if (isMock) {
      const store = getStore()
      const newSuc = {
        id:         genId(),
        nombre:     nombre.trim().toUpperCase(),
        created_at: new Date().toISOString()
      }
      store.sucursales.push(newSuc)
      saveStore(store)
      return res.status(201).json(newSuc)
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

// ─── PUT /api/sucursales/:id ─────────────────────────────────────────────────
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { nombre } = req.body
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    if (isMock) {
      const store = getStore()
      const idx   = store.sucursales.findIndex(s => s.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Sucursal no encontrada' })

      store.sucursales[idx] = { ...store.sucursales[idx], nombre: nombre.trim().toUpperCase() }
      saveStore(store)
      return res.json(store.sucursales[idx])
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

// ─── DELETE /api/sucursales/:id ──────────────────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res) => {
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
