import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db, { genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { logAudit } from '../lib/audit.js'

const router = Router()

// ─── GET /api/sucursales ─────────────────────────────────────────────────────
// Sin auth: solo id, nombre (para pantalla de login de encargadas)
// Con auth admin/soporte: devuelve email y email_notificaciones también
router.get('/', (req, res) => {
  try {
    let user = null
    try {
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
      if (token) user = jwt.verify(token, process.env.JWT_SECRET)
    } catch { /* sin token o inválido — continúa sin auth */ }

    if (user && (user.rol === 'admin' || user.rol === 'soporte')) {
      const sucursales = db.prepare(`
        SELECT s.id, s.nombre, s.email, s.email_notificaciones, s.last_login_at,
               s.password_changed_at, s.password_changed_by,
               p.nombre as password_changed_by_nombre
        FROM sucursales s
        LEFT JOIN profiles p ON s.password_changed_by = p.id
        ORDER BY s.nombre
      `).all()
      return res.json(sucursales)
    }

    // Sin auth o encargada: solo id y nombre
    const sucursales = db.prepare('SELECT id, nombre FROM sucursales ORDER BY nombre').all()
    return res.json(sucursales)
  } catch (err) {
    console.error('Error getSucursales:', err)
    res.status(500).json({ error: 'Error al obtener sucursales' })
  }
})

// ─── POST /api/sucursales ─────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { nombre, email } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const id = genId()
    const hashedPassword = bcrypt.hashSync(process.env.MOCK_PASSWORD_SUCURSALES, 10)
    db.prepare('INSERT INTO sucursales (id, nombre, password, email, created_at) VALUES (?,?,?,?,?)')
      .run(id, nombre.trim().toUpperCase(), hashedPassword, email?.trim() || '', new Date().toISOString())
    const suc = db.prepare('SELECT id, nombre, email, email_notificaciones, created_at FROM sucursales WHERE id = ?').get(id)
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CREAR_SUCURSAL', entidad: 'sucursal', entidad_id: id, detalle: `Creada: ${nombre.trim().toUpperCase()}`, ip: req.ip })
    return res.status(201).json(suc)
  } catch (err) {
    console.error('Error createSucursal:', err)
    res.status(500).json({ error: 'Error al crear la sucursal' })
  }
})

// ─── PUT /api/sucursales/password-todas (solo admin) ──────────────────────────
router.put('/password-todas', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })

    const hashedPassword = bcrypt.hashSync(password, 10)
    const now = new Date().toISOString()
    const info = db.prepare('UPDATE sucursales SET password = ?, password_changed_by = ?, password_changed_at = ?')
      .run(hashedPassword, req.user.sub, now)
    // Revocar refresh tokens de todas las sucursales
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE rol = 'encargada'").run()
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CAMBIO_PASSWORD_TODAS_SUCURSALES', detalle: `${info.changes} sucursales actualizadas`, ip: req.ip })
    return res.json({ ok: true, message: `Contraseña actualizada en ${info.changes} sucursales` })
  } catch (err) {
    console.error('Error cambiarPasswordTodas:', err)
    res.status(500).json({ error: 'Error al cambiar las contraseñas' })
  }
})

// ─── PUT /api/sucursales/:id ──────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const { nombre, email, email_notificaciones } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })

    db.prepare('UPDATE sucursales SET nombre=?, email=?, email_notificaciones=? WHERE id=?')
      .run(nombre.trim().toUpperCase(), email?.trim() || '', email_notificaciones !== false ? 1 : 0, id)
    const suc = db.prepare('SELECT id, nombre, email, email_notificaciones, created_at FROM sucursales WHERE id = ?').get(id)
    return res.json(suc)
  } catch (err) {
    console.error('Error updateSucursal:', err)
    res.status(500).json({ error: 'Error al actualizar la sucursal' })
  }
})

// ─── PUT /api/sucursales/:id/password (solo admin) ────────────────────────────
router.put('/:id/password', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body
    if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })

    const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })
    db.prepare('UPDATE sucursales SET password = ?, password_changed_by = ?, password_changed_at = ? WHERE id = ?')
      .run(bcrypt.hashSync(password, 10), req.user.sub, new Date().toISOString(), id)
    // Revocar refresh tokens de esta sucursal
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE rol = 'encargada' AND sucursal_id = ?").run(id)
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'CAMBIO_PASSWORD_SUCURSAL', entidad: 'sucursal', entidad_id: id, ip: req.ip })
    return res.json({ ok: true, message: 'Contraseña actualizada' })
  } catch (err) {
    console.error('Error cambiarPassword:', err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

// ─── DELETE /api/sucursales/:id ───────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const exists = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id)
    if (!exists) return res.status(404).json({ error: 'Sucursal no encontrada' })

    // Verificar que no tenga tickets asociados
    const ticketCount = db.prepare('SELECT COUNT(*) as n FROM tickets WHERE sucursal_id = ?').get(id)
    if (ticketCount.n > 0) {
      return res.status(409).json({ error: `No se puede eliminar: tiene ${ticketCount.n} ticket(s) asociado(s)` })
    }

    const suc = db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(id)
    db.prepare('DELETE FROM sucursales WHERE id = ?').run(id)
    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'ELIMINAR_SUCURSAL', entidad: 'sucursal', entidad_id: id, detalle: `Eliminada: ${suc?.nombre}`, ip: req.ip })
    return res.json({ ok: true })
  } catch (err) {
    console.error('Error deleteSucursal:', err)
    res.status(500).json({ error: 'Error al eliminar la sucursal' })
  }
})

export default router
