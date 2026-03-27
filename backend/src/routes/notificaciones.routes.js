import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import db, { genId } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// ─── GET /api/notificaciones ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const notifs = db.prepare('SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY created_at DESC').all(req.user.sub)
      return res.json(notifs.map(n => ({ ...n, leida: !!n.leida })))
    }

    const { data, error } = await supabase
      .from('notificaciones').select('*').eq('usuario_id', req.user.sub).order('created_at', { ascending: false })
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getNotificaciones:', err)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// ─── GET /api/notificaciones/no-leidas ────────────────────────────────────────
router.get('/no-leidas', async (req, res) => {
  try {
    if (isMock) {
      const row = db.prepare('SELECT COUNT(*) as count FROM notificaciones WHERE usuario_id = ? AND leida = 0').get(req.user.sub)
      return res.json({ count: row.count })
    }

    const { count, error } = await supabase
      .from('notificaciones').select('*', { count: 'exact', head: true }).eq('usuario_id', req.user.sub).eq('leida', false)
    if (error) throw error
    return res.json({ count: count || 0 })

  } catch (err) {
    console.error('Error countNoLeidas:', err)
    res.status(500).json({ error: 'Error al contar notificaciones' })
  }
})

// ─── PUT /api/notificaciones/leer-todas ───────────────────────────────────────
router.put('/leer-todas', async (req, res) => {
  try {
    if (isMock) {
      db.prepare('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0').run(req.user.sub)
      return res.json({ ok: true })
    }

    const { error } = await supabase
      .from('notificaciones').update({ leida: true }).eq('usuario_id', req.user.sub).eq('leida', false)
    if (error) throw error
    return res.json({ ok: true })

  } catch (err) {
    console.error('Error leerTodas:', err)
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
})

// ─── PUT /api/notificaciones/:id/leer ─────────────────────────────────────────
router.put('/:id/leer', async (req, res) => {
  try {
    if (isMock) {
      const info = db.prepare('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?').run(req.params.id, req.user.sub)
      if (info.changes === 0) return res.status(404).json({ error: 'Notificación no encontrada' })
      const notif = db.prepare('SELECT * FROM notificaciones WHERE id = ?').get(req.params.id)
      return res.json({ ...notif, leida: !!notif.leida })
    }

    const { data, error } = await supabase
      .from('notificaciones').update({ leida: true }).eq('id', req.params.id).eq('usuario_id', req.user.sub).select().single()
    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error marcarLeida:', err)
    res.status(500).json({ error: 'Error al marcar notificación' })
  }
})

// ─── Helper: crear notificación (usado desde otros módulos) ───────────────────
export function crearNotificacion({ usuario_id, ticket_id, mensaje, tipo }) {
  const id = genId()
  db.prepare('INSERT INTO notificaciones (id, usuario_id, ticket_id, mensaje, tipo, leida, created_at) VALUES (?,?,?,?,?,0,?)')
    .run(id, usuario_id, ticket_id || null, mensaje, tipo || 'info', new Date().toISOString())
  return id
}

export default router
