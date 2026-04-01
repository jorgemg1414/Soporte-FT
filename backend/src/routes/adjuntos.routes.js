import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync, unlinkSync } from 'fs'
import db, { genId } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${genId()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido'))
    }
  }
})

const router = Router()
router.use(authenticate)

// Helper: verificar que el usuario tiene acceso al ticket
function checkTicketAccess(ticketId, user) {
  const ticket = db.prepare('SELECT sucursal_id FROM tickets WHERE id = ?').get(ticketId)
  if (!ticket) return { error: 'Ticket no encontrado', status: 404 }
  if (user.rol === 'encargada' && ticket.sucursal_id !== user.sucursal_id) {
    return { error: 'Sin permisos', status: 403 }
  }
  return null
}

// ─── POST /api/adjuntos/ticket/:ticketId ──────────────────────────────────────
router.post('/ticket/:ticketId', upload.array('files', 5), (req, res) => {
  try {
    const { ticketId } = req.params
    const accessErr = checkTicketAccess(ticketId, req.user)
    if (accessErr) return res.status(accessErr.status).json({ error: accessErr.error })

    if (!req.files?.length) return res.status(400).json({ error: 'No se enviaron archivos' })

    const insert = db.prepare('INSERT INTO adjuntos (id, ticket_id, comentario_id, usuario_id, filename, original_name, mimetype, size, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    const now = new Date().toISOString()
    const saved = []

    for (const file of req.files) {
      const id = genId()
      insert.run(id, ticketId, null, req.user.sub, file.filename, file.originalname, file.mimetype, file.size, now)
      saved.push({ id, ticket_id: ticketId, filename: file.filename, original_name: file.originalname, mimetype: file.mimetype, size: file.size, created_at: now })
    }

    return res.status(201).json(saved)
  } catch (err) {
    console.error('Error upload:', err)
    res.status(500).json({ error: 'Error al subir archivos' })
  }
})

// ─── POST /api/adjuntos/comentario/:ticketId/:comentarioId ────────────────────
router.post('/comentario/:ticketId/:comentarioId', upload.array('files', 3), (req, res) => {
  try {
    const { ticketId, comentarioId } = req.params
    const accessErr = checkTicketAccess(ticketId, req.user)
    if (accessErr) return res.status(accessErr.status).json({ error: accessErr.error })

    const com = db.prepare('SELECT id FROM comentarios WHERE id = ? AND ticket_id = ?').get(comentarioId, ticketId)
    if (!com) return res.status(404).json({ error: 'Comentario no encontrado' })

    if (!req.files?.length) return res.status(400).json({ error: 'No se enviaron archivos' })

    const insert = db.prepare('INSERT INTO adjuntos (id, ticket_id, comentario_id, usuario_id, filename, original_name, mimetype, size, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    const now = new Date().toISOString()
    const saved = []

    for (const file of req.files) {
      const id = genId()
      insert.run(id, ticketId, comentarioId, req.user.sub, file.filename, file.originalname, file.mimetype, file.size, now)
      saved.push({ id, ticket_id: ticketId, comentario_id: comentarioId, filename: file.filename, original_name: file.originalname, mimetype: file.mimetype, size: file.size })
    }

    return res.status(201).json(saved)
  } catch (err) {
    console.error('Error upload comentario:', err)
    res.status(500).json({ error: 'Error al subir archivos' })
  }
})

// ─── GET /api/adjuntos/ticket/:ticketId ───────────────────────────────────────
router.get('/ticket/:ticketId', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM adjuntos WHERE ticket_id = ? ORDER BY created_at ASC').all(req.params.ticketId)
    return res.json(rows)
  } catch (err) {
    console.error('Error getAdjuntos:', err)
    res.status(500).json({ error: 'Error al obtener adjuntos' })
  }
})

// ─── GET /api/adjuntos/download/:id ──────────────────────────────────────────
router.get('/download/:id', (req, res) => {
  try {
    const adj = db.prepare('SELECT a.*, t.sucursal_id FROM adjuntos a JOIN tickets t ON a.ticket_id = t.id WHERE a.id = ?').get(req.params.id)
    if (!adj) return res.status(404).json({ error: 'Archivo no encontrado' })

    if (req.user.rol === 'encargada' && adj.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const filePath = path.join(UPLOADS_DIR, adj.filename)
    if (!existsSync(filePath)) return res.status(404).json({ error: 'Archivo no existe en disco' })

    res.setHeader('Content-Type', adj.mimetype)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(adj.original_name)}"`)
    return res.sendFile(filePath)
  } catch (err) {
    console.error('Error download:', err)
    res.status(500).json({ error: 'Error al descargar archivo' })
  }
})

// ─── DELETE /api/adjuntos/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const adj = db.prepare('SELECT * FROM adjuntos WHERE id = ?').get(req.params.id)
    if (!adj) return res.status(404).json({ error: 'Archivo no encontrado' })

    // Solo el dueño o admin puede borrar
    if (adj.usuario_id !== req.user.sub && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const filePath = path.join(UPLOADS_DIR, adj.filename)
    if (existsSync(filePath)) unlinkSync(filePath)

    db.prepare('DELETE FROM adjuntos WHERE id = ?').run(req.params.id)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Error deleteAdjunto:', err)
    res.status(500).json({ error: 'Error al eliminar archivo' })
  }
})

export default router
