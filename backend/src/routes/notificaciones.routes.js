import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// ─── GET /api/notificaciones ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      const notifs = store.notificaciones
        .filter(n => n.usuario_id === req.user.sub)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return res.json(notifs)
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', req.user.sub)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getNotificaciones:', err)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// ─── GET /api/notificaciones/no-leidas (conteo) ──────────────────────────────
router.get('/no-leidas', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      const count = store.notificaciones
        .filter(n => n.usuario_id === req.user.sub && !n.leida)
        .length
      return res.json({ count })
    }

    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', req.user.sub)
      .eq('leida', false)

    if (error) throw error
    return res.json({ count: count || 0 })

  } catch (err) {
    console.error('Error countNoLeidas:', err)
    res.status(500).json({ error: 'Error al contar notificaciones' })
  }
})

// ─── PUT /api/notificaciones/leer-todas ───────────────────────────────────────
// IMPORTANT: Must be before /:id/leer to avoid matching "leer-todas" as :id
router.put('/leer-todas', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      store.notificaciones
        .filter(n => n.usuario_id === req.user.sub)
        .forEach(n => { n.leida = true })
      saveStore(store)
      return res.json({ ok: true })
    }

    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', req.user.sub)
      .eq('leida', false)

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
      const store = getStore()
      const notif = store.notificaciones.find(n => n.id === req.params.id && n.usuario_id === req.user.sub)
      if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
      notif.leida = true
      saveStore(store)
      return res.json(notif)
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.sub)
      .select()
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error marcarLeida:', err)
    res.status(500).json({ error: 'Error al marcar notificación' })
  }
})

// ─── Helper: crear notificación (usado desde otros módulos) ───────────────────
export function crearNotificacion(store, { usuario_id, ticket_id, mensaje, tipo }) {
  const notif = {
    id: genId(),
    usuario_id,
    ticket_id: ticket_id || null,
    mensaje,
    tipo: tipo || 'info',
    leida: false,
    created_at: new Date().toISOString()
  }
  store.notificaciones.push(notif)
  return notif
}

export default router
