import { Router } from 'express'
import db, { genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// ─── GET /api/usuarios/tecnicos (soporte + admin) ─────────────────────────────
router.get('/tecnicos', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const tecnicos = db.prepare("SELECT id, nombre, rol FROM profiles WHERE rol IN ('soporte','admin') ORDER BY nombre").all()
    return res.json(tecnicos)
  } catch (err) {
    console.error('Error getTecnicos:', err)
    res.status(500).json({ error: 'Error al obtener técnicos' })
  }
})

// A partir de aquí, todo requiere admin
router.use(requireRole('admin'))

// ─── GET /api/usuarios ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const profiles = db.prepare('SELECT * FROM profiles ORDER BY nombre').all()
    return res.json(profiles.map(p => {
      const suc = p.sucursal_id
        ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(p.sucursal_id)
        : null
      return { ...p, sucursales: suc || null }
    }))
  } catch (err) {
    console.error('Error getUsuarios:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ─── POST /api/usuarios ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { nombre, email, password, rol, sucursal_id } = req.body

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' })
    }

    const exists = db.prepare('SELECT id FROM users_auth WHERE email = ?').get(email)
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })

    const newId = genId()

    db.prepare('INSERT INTO users_auth (id, email, password) VALUES (?,?,?)').run(newId, email, password)
    db.prepare('INSERT INTO profiles (id, nombre, rol, sucursal_id, email) VALUES (?,?,?,?,?)')
      .run(newId, nombre, rol, sucursal_id || null, email)

    const suc = sucursal_id ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(sucursal_id) : null
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(newId)

    return res.status(201).json({ ...profile, sucursales: suc || null })
  } catch (err) {
    console.error('Error createUsuario:', err)
    res.status(500).json({ error: err.message || 'Error al crear el usuario' })
  }
})

// ─── PUT /api/usuarios/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { nombre, rol, sucursal_id } = req.body

    if (!nombre || !rol) return res.status(400).json({ error: 'Nombre y rol son requeridos' })

    const exists = db.prepare('SELECT id FROM profiles WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' })

    db.prepare('UPDATE profiles SET nombre=?, rol=?, sucursal_id=? WHERE id=?')
      .run(nombre, rol, sucursal_id || null, id)

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id)
    const suc = profile.sucursal_id
      ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(profile.sucursal_id)
      : null

    return res.json({ ...profile, sucursales: suc || null })
  } catch (err) {
    console.error('Error updateUsuario:', err)
    res.status(500).json({ error: 'Error al actualizar el usuario' })
  }
})

// ─── DELETE /api/usuarios/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params

    const exists = db.prepare('SELECT id FROM profiles WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' })

    db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
    db.prepare('DELETE FROM users_auth WHERE id = ?').run(id)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Error deleteUsuario:', err)
    res.status(500).json({ error: 'Error al eliminar el usuario' })
  }
})

export default router
