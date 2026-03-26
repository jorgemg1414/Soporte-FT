import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { isMock, supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/catalogos?tipo=tipos_falla_equipo
router.get('/', authenticate, async (req, res) => {
  try {
    const { tipo } = req.query
    if (isMock) {
      const store = getStore()
      const items = tipo
        ? store.catalogos.filter(c => c.tipo === tipo && c.activo)
        : store.catalogos.filter(c => c.activo)
      return res.json(items.sort((a, b) => a.orden - b.orden))
    }
    let query = supabase.from('catalogos').select('*').eq('activo', true).order('orden')
    if (tipo) query = query.eq('tipo', tipo)
    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/catalogos/all  (admin: incluye inactivos)
router.get('/all', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { tipo } = req.query
    if (isMock) {
      const store = getStore()
      const items = tipo
        ? store.catalogos.filter(c => c.tipo === tipo)
        : store.catalogos
      return res.json(items.sort((a, b) => a.orden - b.orden))
    }
    let query = supabase.from('catalogos').select('*').order('orden')
    if (tipo) query = query.eq('tipo', tipo)
    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/catalogos
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { tipo, label, value, grupo, orden, activo = true } = req.body
    if (!tipo || !label || !value) return res.status(400).json({ error: 'Faltan campos requeridos' })

    if (isMock) {
      const store = getStore()
      const maxOrden = store.catalogos.filter(c => c.tipo === tipo).reduce((m, c) => Math.max(m, c.orden), 0)
      const nuevo = { id: genId(), tipo, label, value, grupo: grupo || '', orden: orden ?? maxOrden + 1, activo }
      store.catalogos.push(nuevo)
      saveStore(store)
      return res.status(201).json(nuevo)
    }
    const { data, error } = await supabase.from('catalogos').insert({ tipo, label, value, grupo, orden, activo }).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/catalogos/:id
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { label, value, grupo, orden, activo } = req.body
    if (isMock) {
      const store = getStore()
      const idx = store.catalogos.findIndex(c => c.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'No encontrado' })
      store.catalogos[idx] = { ...store.catalogos[idx], label, value, grupo, orden, activo }
      saveStore(store)
      return res.json(store.catalogos[idx])
    }
    const { data, error } = await supabase.from('catalogos').update({ label, value, grupo, orden, activo }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/catalogos/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      store.catalogos = store.catalogos.filter(c => c.id !== req.params.id)
      saveStore(store)
      return res.json({ ok: true })
    }
    const { error } = await supabase.from('catalogos').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
