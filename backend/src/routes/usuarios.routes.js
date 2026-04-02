import { Router } from 'express'
import bcrypt from 'bcrypt'
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

// ─── GET /api/usuarios (soporte + admin) ──────────────────────────────────────
router.get('/', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, s.id as _suc_id, s.nombre as _suc_nombre
      FROM profiles p
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      ORDER BY p.nombre
    `).all()
    return res.json(rows.map(p => ({
      ...p,
      _suc_id: undefined,
      _suc_nombre: undefined,
      sucursales: p._suc_id ? { id: p._suc_id, nombre: p._suc_nombre } : null
    })))
  } catch (err) {
    console.error('Error getUsuarios:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ─── PUT /api/usuarios/me/password ───────────────────────────────────────────
router.put('/me/password', requireRole('admin', 'soporte'), (req, res) => {
  try {
    const { actual, nueva } = req.body
    if (!actual || !nueva) return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
    if (nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 8 caracteres' })

    const auth = db.prepare('SELECT * FROM users_auth WHERE id = ?').get(req.user.sub)
    if (!auth) return res.status(404).json({ error: 'Usuario no encontrado' })

    const passwordOk = bcrypt.compareSync(actual, auth.password)
    if (!passwordOk) {
      return res.status(422).json({ error: 'La contraseña actual es incorrecta' })
    }

    db.prepare('UPDATE users_auth SET password = ? WHERE id = ?').run(bcrypt.hashSync(nueva, 10), req.user.sub)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Error changePassword:', err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

// A partir de aquí, escrituras requieren admin
router.use(requireRole('admin'))

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

    db.prepare('INSERT INTO users_auth (id, email, password) VALUES (?,?,?)').run(newId, email, bcrypt.hashSync(password, 10))
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

    // No permitir que un admin se cambie su propio rol
    if (id === req.user.sub && rol !== req.user.rol) {
      return res.status(403).json({ error: 'No puedes cambiar tu propio rol' })
    }

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

    // No permitir que un admin se borre a sí mismo
    if (id === req.user.sub) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' })
    }

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
