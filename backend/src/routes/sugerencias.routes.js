import { Router } from 'express'
import db, { genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

function enrich(s) {
  if (!s) return s
  const suc = s.sucursal_id ? db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(s.sucursal_id) : null
  const resp = s.respondida_por_id ? db.prepare('SELECT nombre FROM profiles WHERE id = ?').get(s.respondida_por_id) : null
  return {
    ...s,
    sucursal_nombre: suc?.nombre || '—',
    respondida_por_nombre: resp?.nombre || null
  }
}

// ─── GET /api/sugerencias ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    let sugerencias
    if (req.user.rol === 'encargada') {
      sugerencias = db.prepare('SELECT * FROM sugerencias WHERE sucursal_id = ? ORDER BY created_at DESC').all(req.user.sucursal_id)
    } else {
      sugerencias = db.prepare('SELECT * FROM sugerencias ORDER BY created_at DESC').all()
    }
    return res.json(sugerencias.map(enrich))
  } catch (err) {
    console.error('Error getSugerencias:', err)
    res.status(500).json({ error: 'Error al obtener sugerencias' })
  }
})

// ─── POST /api/sugerencias ────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { contenido } = req.body
    if (!contenido?.trim()) return res.status(400).json({ error: 'El contenido es requerido' })
    if (contenido.length > 300) return res.status(400).json({ error: 'Máximo 300 caracteres' })

    const id = genId()
    const now = new Date().toISOString()
    db.prepare('INSERT INTO sugerencias (id, usuario_id, sucursal_id, contenido, estado, created_at) VALUES (?,?,?,?,?,?)')
      .run(id, req.user.sub, req.user.sucursal_id || null, contenido.trim(), 'pendiente', now)
    const nueva = db.prepare('SELECT * FROM sugerencias WHERE id = ?').get(id)
    return res.status(201).json(enrich(nueva))
  } catch (err) {
    console.error('Error createSugerencia:', err)
    res.status(500).json({ error: 'Error al crear sugerencia' })
  }
})

// ─── PUT /api/sugerencias/:id/responder ───────────────────────────────────────
router.put('/:id/responder', requireRole('admin', 'soporte'), (req, res) => {
  try {
    const { respuesta, estado } = req.body
    if (!respuesta?.trim()) return res.status(400).json({ error: 'La respuesta es requerida' })

    const estadosValidos = ['pendiente', 'revisada', 'implementada', 'descartada']
    const nuevoEstado = estadosValidos.includes(estado) ? estado : 'revisada'

    const exists = db.prepare('SELECT id FROM sugerencias WHERE id = ?').get(req.params.id)
    if (!exists) return res.status(404).json({ error: 'Sugerencia no encontrada' })

    const now = new Date().toISOString()
    db.prepare('UPDATE sugerencias SET respuesta=?, estado=?, respondida_por_id=?, respondida_at=? WHERE id=?')
      .run(respuesta.trim(), nuevoEstado, req.user.sub, now, req.params.id)

    const updated = db.prepare('SELECT * FROM sugerencias WHERE id = ?').get(req.params.id)
    return res.json(enrich(updated))
  } catch (err) {
    console.error('Error responderSugerencia:', err)
    res.status(500).json({ error: 'Error al responder sugerencia' })
  }
})

export default router
