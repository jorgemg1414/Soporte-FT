import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import db, { genId } from '../lib/database.js'
import { isMock, supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/catalogos?tipo=tipos_falla_equipo
router.get('/', authenticate, async (req, res) => {
  try {
    const { tipo } = req.query
    if (isMock) {
      const items = tipo
        ? db.prepare('SELECT * FROM catalogos WHERE tipo = ? AND activo = 1 ORDER BY orden').all(tipo)
        : db.prepare('SELECT * FROM catalogos WHERE activo = 1 ORDER BY orden').all()
      return res.json(items.map(i => ({ ...i, activo: !!i.activo })))
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
      const items = tipo
        ? db.prepare('SELECT * FROM catalogos WHERE tipo = ? ORDER BY orden').all(tipo)
        : db.prepare('SELECT * FROM catalogos ORDER BY orden').all()
      return res.json(items.map(i => ({ ...i, activo: !!i.activo })))
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
      const maxOrden = db.prepare('SELECT MAX(orden) as m FROM catalogos WHERE tipo = ?').get(tipo)
      const id = genId()
      db.prepare('INSERT INTO catalogos (id, tipo, label, value, grupo, orden, activo) VALUES (?,?,?,?,?,?,?)')
        .run(id, tipo, label, value, grupo || '', orden ?? (maxOrden?.m || 0) + 1, activo ? 1 : 0)
      const nuevo = db.prepare('SELECT * FROM catalogos WHERE id = ?').get(id)
      return res.status(201).json({ ...nuevo, activo: !!nuevo.activo })
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
      const exists = db.prepare('SELECT id FROM catalogos WHERE id = ?').get(req.params.id)
      if (!exists) return res.status(404).json({ error: 'No encontrado' })
      db.prepare('UPDATE catalogos SET label=?, value=?, grupo=?, orden=?, activo=? WHERE id=?')
        .run(label, value, grupo, orden, activo ? 1 : 0, req.params.id)
      const updated = db.prepare('SELECT * FROM catalogos WHERE id = ?').get(req.params.id)
      return res.json({ ...updated, activo: !!updated.activo })
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
      db.prepare('DELETE FROM catalogos WHERE id = ?').run(req.params.id)
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
