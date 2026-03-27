import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import db, { genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// ─── GET /api/sucursales (público — solo id y nombre) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const sucursales = db.prepare('SELECT id, nombre FROM sucursales ORDER BY nombre').all()
      return res.json(sucursales)
    }

    const { data, error } = await supabase.from('sucursales').select('id, nombre').order('nombre')
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getSucursales:', err)
    res.status(500).json({ error: 'Error al obtener sucursales' })
  }
})

// ─── POST /api/sucursales ─────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, email } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    if (isMock) {
      const id = genId()
      db.prepare('INSERT INTO sucursales (id, nombre, password, email, created_at) VALUES (?,?,?,?,?)')
        .run(id, nombre.trim().toUpperCase(), process.env.MOCK_PASSWORD_SUCURSALES, email?.trim() || '', new Date().toISOString())
      const suc = db.prepare('SELECT id, nombre, email, created_at FROM sucursales WHERE id = ?').get(id)
      return res.status(201).json(suc)
    }

    const { data, error } = await supabase.from('sucursales').insert({ nombre: nombre.trim().toUpperCase() }).select().single()
    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error createSucursal:', err)
    res.status(500).json({ error: 'Error al crear la sucursal' })
  }
})

// ─── PUT /api/sucursales/password-todas (solo admin) ──────────────────────────
router.put('/password-todas', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })

    if (isMock) {
      const info = db.prepare('UPDATE sucursales SET password = ?').run(password)
      return res.json({ ok: true, message: `Contraseña actualizada en ${info.changes} sucursales` })
    }

    const { error } = await supabase.from('sucursales').update({ password }).neq('id', '')
    if (error) throw error
    return res.json({ ok: true, message: 'Contraseña actualizada en todas las sucursales' })

  } catch (err) {
    console.error('Error cambiarPasswordTodas:', err)
    res.status(500).json({ error: 'Error al cambiar las contraseñas' })
  }
})

// ─── PUT /api/sucursales/:id ──────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, email } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    if (isMock) {
      const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
      if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })

      db.prepare('UPDATE sucursales SET nombre=?, email=? WHERE id=?')
        .run(nombre.trim().toUpperCase(), email?.trim() || '', id)
      const suc = db.prepare('SELECT id, nombre, email, created_at FROM sucursales WHERE id = ?').get(id)
      return res.json(suc)
    }

    const { data, error } = await supabase.from('sucursales').update({ nombre: nombre.trim().toUpperCase() }).eq('id', id).select().single()
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
    if (!password || password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })

    if (isMock) {
      const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
      if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })
      db.prepare('UPDATE sucursales SET password = ? WHERE id = ?').run(password, id)
      return res.json({ ok: true, message: 'Contraseña actualizada' })
    }

    const { error } = await supabase.from('sucursales').update({ password }).eq('id', id)
    if (error) throw error
    return res.json({ ok: true, message: 'Contraseña actualizada' })

  } catch (err) {
    console.error('Error cambiarPassword:', err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

// ─── DELETE /api/sucursales/:id ───────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
      if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })
      db.prepare('DELETE FROM sucursales WHERE id = ?').run(id)
      return res.json({ ok: true })
    }

    const { error } = await supabase.from('sucursales').delete().eq('id', id)
    if (error) throw error
    return res.json({ ok: true })

  } catch (err) {
    console.error('Error deleteSucursal:', err)
    res.status(500).json({ error: 'Error al eliminar la sucursal' })
  }
})

export default router
