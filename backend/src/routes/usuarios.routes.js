import { Router } from 'express'
import bcrypt from 'bcrypt'
import db, { genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { logAudit } from '../lib/audit.js'

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
      SELECT p.*, s.id as _suc_id, s.nombre as _suc_nombre,
             cb.nombre as _created_by_nombre
      FROM profiles p
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      LEFT JOIN profiles cb ON p.created_by = cb.id
      ORDER BY p.nombre
    `).all()
    return res.json(rows.map(p => ({
      ...p,
      _suc_id: undefined,
      _suc_nombre: undefined,
      _created_by_nombre: undefined,
      sucursales: p._suc_id ? { id: p._suc_id, nombre: p._suc_nombre } : null,
      created_by_nombre: p._created_by_nombre || null
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
    // Revocar refresh tokens activos (fuerza re-login en otros dispositivos)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(req.user.sub)
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CAMBIO_PASSWORD_PROPIO', entidad: 'usuario', entidad_id: req.user.sub, ip: req.ip })
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
    const ROLES_VALIDOS = ['admin', 'soporte', 'encargada']

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' })
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido. Valores permitidos: admin, soporte, encargada' })
    }

    const exists = db.prepare('SELECT id FROM users_auth WHERE email = ?').get(email)
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })

    const newId = genId()

    const now = new Date().toISOString()
    db.transaction(() => {
      db.prepare('INSERT INTO users_auth (id, email, password) VALUES (?,?,?)').run(newId, email, bcrypt.hashSync(password, 10))
      db.prepare('INSERT INTO profiles (id, nombre, rol, sucursal_id, email, created_by, created_at) VALUES (?,?,?,?,?,?,?)')
        .run(newId, nombre, rol, sucursal_id || null, email, req.user.sub, now)
    })()

    const suc = sucursal_id ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(sucursal_id) : null
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(newId)

    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CREAR_USUARIO', entidad: 'usuario', entidad_id: newId, detalle: `Creado: ${nombre} (${rol})`, ip: req.ip })
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
    const { nombre, rol, sucursal_id, email } = req.body
    const ROLES_VALIDOS = ['admin', 'soporte', 'encargada']

    if (!nombre || !rol) return res.status(400).json({ error: 'Nombre y rol son requeridos' })
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido. Valores permitidos: admin, soporte, encargada' })
    }

    const exists = db.prepare('SELECT p.id, p.rol, a.email FROM profiles p LEFT JOIN users_auth a ON p.id = a.id WHERE p.id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' })

    if (id === req.user.sub && rol !== req.user.rol) {
      return res.status(403).json({ error: 'No puedes cambiar tu propio rol' })
    }

    // Evitar dejar el sistema sin admins
    if (exists.rol === 'admin' && rol !== 'admin') {
      const totalAdmins = db.prepare("SELECT COUNT(*) as n FROM profiles WHERE rol = 'admin'").get()
      if (totalAdmins.n <= 1) {
        return res.status(409).json({ error: 'No se puede degradar: es el último administrador del sistema' })
      }
    }

    // Validar email duplicado antes de actualizar
    if (email && email !== exists.email) {
      const emailTaken = db.prepare('SELECT id FROM users_auth WHERE email = ? AND id != ?').get(email, id)
      if (emailTaken) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
    }

    db.transaction(() => {
      db.prepare('UPDATE profiles SET nombre=?, rol=?, sucursal_id=? WHERE id=?')
        .run(nombre, rol, sucursal_id || null, id)
      if (email && email !== exists.email) {
        db.prepare('UPDATE users_auth SET email = ? WHERE id = ?').run(email, id)
        db.prepare('UPDATE profiles SET email = ? WHERE id = ?').run(email, id)
      }
    })()

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id)
    const suc = profile.sucursal_id
      ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(profile.sucursal_id)
      : null

    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'EDITAR_USUARIO', entidad: 'usuario', entidad_id: id, detalle: `Editado: ${nombre} (${rol})`, ip: req.ip })
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

    if (id === req.user.sub) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' })
    }

    const exists = db.prepare('SELECT id, rol FROM profiles WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' })

    // Evitar eliminar el último admin
    if (exists.rol === 'admin') {
      const totalAdmins = db.prepare("SELECT COUNT(*) as n FROM profiles WHERE rol = 'admin'").get()
      if (totalAdmins.n <= 1) {
        return res.status(409).json({ error: 'No se puede eliminar: es el último administrador del sistema' })
      }
    }

    const ticketsCount = db.prepare(`
      SELECT COUNT(*) as n FROM tickets 
      WHERE asignado_a = ? OR usuario_id = ? OR resuelto_por_id = ?
      OR asignados_ids LIKE ? OR asignados_ids LIKE ? OR asignados_ids LIKE ?
    `).get(id, id, id, `%"${id}"%`, `"${id}"%`, id)

    if (ticketsCount.n > 0) {
      return res.status(409).json({ 
        error: `No se puede eliminar: el usuario tiene ${ticketsCount.n} ticket(s) asociados. Transfiere primero los tickets.`
      })
    }

    const deletedProfile = db.prepare('SELECT nombre, rol FROM profiles WHERE id = ?').get(id)
    db.transaction(() => {
      db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
      db.prepare('DELETE FROM users_auth WHERE id = ?').run(id)
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(id)
    })()
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'ELIMINAR_USUARIO', entidad: 'usuario', entidad_id: id, detalle: `Eliminado: ${deletedProfile?.nombre} (${deletedProfile?.rol})`, ip: req.ip })
    return res.json({ ok: true })
  } catch (err) {
    console.error('Error deleteUsuario:', err)
    res.status(500).json({ error: 'Error al eliminar el usuario' })
  }
})

export default router
