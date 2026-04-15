import { Router } from 'express'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads')
import db, { generateFolio, genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { logAudit } from '../lib/audit.js'
import { crearNotificacion } from './notificaciones.routes.js'
import { notificarCambioEstado, notificarComentario, notificarAsignacion, notificarNuevoTicket } from '../lib/mailer.js'
import { broadcast } from '../lib/broadcaster.js'

const router = Router()

router.use(authenticate)

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Query base con JOINs - un solo query obtiene ticket + relaciones
const TICKET_SELECT = `
  SELECT t.*,
    s.nombre as _sucursal_nombre,
    p.nombre as _usuario_nombre, p.rol as _usuario_rol,
    r.nombre as _resuelto_por_nombre,
    c.nombre as _cerrado_por_nombre,
    re.nombre as _reabierto_por_nombre,
    u.nombre as _urgente_por_nombre,
    ap.nombre as _asignado_por_nombre
  FROM tickets t
  LEFT JOIN sucursales s ON t.sucursal_id = s.id
  LEFT JOIN profiles p ON t.usuario_id = p.id
  LEFT JOIN profiles r ON t.resuelto_por_id = r.id
  LEFT JOIN profiles c ON t.cerrado_por_id = c.id
  LEFT JOIN profiles re ON t.reabierto_por_id = re.id
  LEFT JOIN profiles u ON t.urgente_por_id = u.id
  LEFT JOIN profiles ap ON t.asignado_por_id = ap.id
`

function parseAsignados(raw) {
  try { const arr = JSON.parse(raw || '[]'); return Array.isArray(arr) ? arr.filter(Boolean) : [] }
  catch { return [] }
}

function mapTicket(row) {
  if (!row) return null
  return {
    id: row.id, folio: row.folio, urgente: !!row.urgente, titulo: row.titulo,
    categoria: row.categoria, tipo_documento: row.tipo_documento,
    folio_pvwin: row.folio_pvwin, folio_correcto: row.folio_correcto,
    descripcion: row.descripcion, detalle_falla: row.detalle_falla,
    tipo_falla: row.tipo_falla, tipo_traspaso: row.tipo_traspaso,
    estado: row.estado, sucursal_id: row.sucursal_id, usuario_id: row.usuario_id,
    asignado_a: row.asignado_a,
    asignados_ids: parseAsignados(row.asignados_ids),
    resuelto_por_id: row.resuelto_por_id,
    resuelto_at: row.resuelto_at, adjuntos: JSON.parse(row.adjuntos || '[]'),
    cerrado_por_id: row.cerrado_por_id, cerrado_at: row.cerrado_at,
    reabierto_por_id: row.reabierto_por_id, reabierto_at: row.reabierto_at,
    urgente_por_id: row.urgente_por_id, urgente_at: row.urgente_at,
    asignado_por_id: row.asignado_por_id, asignado_at: row.asignado_at,
    created_at: row.created_at, updated_at: row.updated_at,
    sucursales: row._sucursal_nombre ? { id: row.sucursal_id, nombre: row._sucursal_nombre } : null,
    profiles: row._usuario_nombre ? { id: row.usuario_id, nombre: row._usuario_nombre, rol: row._usuario_rol } : null,
    resuelto_por: row._resuelto_por_nombre ? { id: row.resuelto_por_id, nombre: row._resuelto_por_nombre } : null,
    cerrado_por: row._cerrado_por_nombre ? { id: row.cerrado_por_id, nombre: row._cerrado_por_nombre } : null,
    reabierto_por: row._reabierto_por_nombre ? { id: row.reabierto_por_id, nombre: row._reabierto_por_nombre } : null,
    urgente_por: row._urgente_por_nombre ? { id: row.urgente_por_id, nombre: row._urgente_por_nombre } : null,
    asignado_por: row._asignado_por_nombre ? { id: row.asignado_por_id, nombre: row._asignado_por_nombre } : null
  }
}

// Enriquece una lista de tickets con los nombres/rol de los técnicos asignados
function enrichAsignados(tickets) {
  const allIds = new Set()
  tickets.forEach(t => t.asignados_ids?.forEach(id => allIds.add(id)))
  if (allIds.size === 0) {
    tickets.forEach(t => { t.asignados = [] })
    return tickets
  }
  const idArr = [...allIds]
  const placeholders = idArr.map(() => '?').join(',')
  const profs = db.prepare(`SELECT id, nombre, rol FROM profiles WHERE id IN (${placeholders})`).all(...idArr)
  const profMap = new Map(profs.map(p => [p.id, p]))
  tickets.forEach(t => {
    t.asignados = (t.asignados_ids || []).map(id => profMap.get(id)).filter(Boolean)
  })
  return tickets
}

// Prepared statements
const stmtTicketsAll       = db.prepare(`${TICKET_SELECT} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
const stmtTicketsBySucursal = db.prepare(`${TICKET_SELECT} WHERE t.sucursal_id = ? ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
const stmtTicketById       = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`)
const stmtCountAll         = db.prepare('SELECT COUNT(*) as total FROM tickets')
const stmtCountBySucursal  = db.prepare('SELECT COUNT(*) as total FROM tickets WHERE sucursal_id = ?')

const stmtComentarios = db.prepare(`
  SELECT c.*, p.nombre as _profile_nombre, p.rol as _profile_rol
  FROM comentarios c
  LEFT JOIN profiles p ON c.usuario_id = p.id
  WHERE c.ticket_id = ?
  ORDER BY c.created_at ASC
`)

const stmtNotas = db.prepare(`
  SELECT n.*, p.nombre as _profile_nombre, p.rol as _profile_rol
  FROM notas_internas n
  LEFT JOIN profiles p ON n.usuario_id = p.id
  WHERE n.ticket_id = ?
  ORDER BY n.created_at ASC
`)

function mapComment(row) {
  return {
    id: row.id, ticket_id: row.ticket_id, usuario_id: row.usuario_id,
    contenido: row.contenido, created_at: row.created_at,
    profiles: row._profile_nombre ? { id: row.usuario_id, nombre: row._profile_nombre, rol: row._profile_rol } : null
  }
}

function mapNota(row) {
  return {
    id: row.id, ticket_id: row.ticket_id, usuario_id: row.usuario_id,
    contenido: row.contenido, created_at: row.created_at,
    profiles: row._profile_nombre ? { id: row.usuario_id, nombre: row._profile_nombre, rol: row._profile_rol } : null
  }
}

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    // Auto-marcar como urgente tickets que superan el umbral SLA
    const SLA_AUTO_HORAS = parseInt(process.env.SLA_AUTO_URGENTE_HOURS || '8')
    const threshold = new Date(Date.now() - SLA_AUTO_HORAS * 3600000).toISOString()
    db.prepare("UPDATE tickets SET urgente=1, updated_at=? WHERE estado IN ('abierto','en_proceso') AND urgente=0 AND created_at < ?")
      .run(new Date().toISOString(), threshold)

    // Paginación opcional: si se pasa ?page, devuelve paginado; si no, array directo
    const hasPagination = req.query.page !== undefined

    if (hasPagination) {
      const page  = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
      const offset = (page - 1) * limit

      let rows, countRow
      if (req.user.rol === 'encargada') {
        rows = stmtTicketsBySucursal.all(req.user.sucursal_id, limit, offset)
        countRow = stmtCountBySucursal.get(req.user.sucursal_id)
      } else {
        rows = stmtTicketsAll.all(limit, offset)
        countRow = stmtCountAll.get()
      }

      const total = countRow.total
      return res.json({
        data: enrichAsignados(rows.map(mapTicket)),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      })
    }

    // Sin paginación: devuelve array directo (compatibilidad con frontend actual)
    let rows
    if (req.user.rol === 'encargada') {
      rows = stmtTicketsBySucursal.all(req.user.sucursal_id, 500, 0)
    } else {
      rows = stmtTicketsAll.all(500, 0)
    }
    return res.json(enrichAsignados(rows.map(mapTicket)))

  } catch (err) {
    console.error('Error fetchTickets:', err)
    res.status(500).json({ error: 'Error al obtener tickets' })
  }
})

// ─── GET /api/tickets/stats ───────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const rol = req.user.rol
    const sucursalId = req.user.sucursal_id

    // Condición WHERE según rol
    const where = rol === 'encargada' ? 'WHERE t.sucursal_id = ?' : ''
    const params = rol === 'encargada' ? [sucursalId] : []

    // Por estado
    const porEstado = db.prepare(`SELECT estado, COUNT(*) as total FROM tickets t ${where} GROUP BY estado`).all(...params)
    const estados = { abiertos: 0, en_proceso: 0, resueltos: 0, cerrados: 0 }
    porEstado.forEach(r => {
      if (r.estado === 'abierto')    estados.abiertos = r.total
      if (r.estado === 'en_proceso') estados.en_proceso = r.total
      if (r.estado === 'resuelto')   estados.resueltos = r.total
      if (r.estado === 'cerrado')    estados.cerrados = r.total
    })

    // Totales
    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM tickets t ${where}`).get(...params)
    const urgentesRow = db.prepare(`SELECT COUNT(*) as total FROM tickets t ${where ? where + ' AND' : 'WHERE'} urgente = 1`).get(...params)

    // Por categoría
    const porCategoria = db.prepare(`SELECT categoria, COUNT(*) as total FROM tickets t ${where} GROUP BY categoria`).all(...params)

    // Por sucursal (solo para admin/soporte)
    let porSucursal = []
    if (rol !== 'encargada') {
      porSucursal = db.prepare(`
        SELECT s.nombre, COUNT(t.id) as total
        FROM sucursales s
        LEFT JOIN tickets t ON t.sucursal_id = s.id
        GROUP BY s.nombre
        HAVING total > 0
        ORDER BY total DESC
        LIMIT 10
      `).all()
    }

    // Por día (últimos 14)
    const porDia = db.prepare(`
      SELECT DATE(created_at) as fecha, COUNT(*) as total
      FROM tickets t
      ${where ? where + ' AND' : 'WHERE'} created_at >= date('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY fecha ASC
    `).all(...params)

    // Completar días faltantes
    const diasMap = {}
    const hoy = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(hoy.getDate() - i)
      diasMap[d.toISOString().slice(0, 10)] = 0
    }
    porDia.forEach(r => { if (diasMap[r.fecha] !== undefined) diasMap[r.fecha] = r.total })
    const porDiaCompleto = Object.entries(diasMap).map(([fecha, total]) => ({ fecha, total }))

    // Tiempo promedio de resolución (en horas)
    const promRow = db.prepare(`
      SELECT AVG((julianday(resuelto_at) - julianday(created_at)) * 24) as horas
      FROM tickets t
      ${where ? where + ' AND' : 'WHERE'} estado = 'resuelto' AND resuelto_at IS NOT NULL
    `).get(...params)
    const tiempo_promedio_horas = promRow.horas != null ? Math.round(promRow.horas * 10) / 10 : null

    // Por técnico (resueltos)
    let porTecnico = []
    if (rol !== 'encargada') {
      porTecnico = db.prepare(`
        SELECT p.nombre, COUNT(t.id) as total
        FROM tickets t
        JOIN profiles p ON t.resuelto_por_id = p.id
        WHERE t.estado = 'resuelto' AND t.resuelto_por_id IS NOT NULL
        GROUP BY p.nombre
        ORDER BY total DESC
      `).all()
    }

    // SLA violations
    const SLA_WARN = parseInt(process.env.SLA_WARN_HOURS || '4')
    const ahora = Date.now()
    const slaViolations = db.prepare(`
      SELECT COUNT(*) as total FROM tickets t
      ${where ? where + ' AND' : 'WHERE'} estado IN ('abierto', 'en_proceso')
      AND (julianday('now') - julianday(created_at)) * 24 >= ?
    `).get(...params, SLA_WARN)

    return res.json({
      total: totalRow.total,
      ...estados,
      tickets_urgentes: urgentesRow.total || 0,
      tiempo_promedio_horas,
      sla_violations: slaViolations.total,
      por_categoria: porCategoria,
      por_sucursal: porSucursal,
      por_dia: porDiaCompleto,
      por_tecnico: porTecnico
    })

  } catch (err) {
    console.error('Error fetchStats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// Campos permitidos en creación de ticket (whitelist)
const TICKET_ALLOWED_FIELDS = [
  'titulo', 'categoria', 'descripcion', 'tipo_documento', 'folio_pvwin',
  'folio_correcto', 'detalle_falla', 'tipo_falla', 'tipo_traspaso'
]
const CATEGORIAS_VALIDAS = ['cancelacion_documento', 'cancelacion_portal', 'falla_pvwin', 'falla_computadora', 'otro']
const MAX_TEXT_LENGTH = 300

function sanitizeTicketData(body) {
  const clean = {}
  for (const key of TICKET_ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      if (typeof body[key] === 'string' && body[key].length > MAX_TEXT_LENGTH) {
        clean[key] = body[key].slice(0, MAX_TEXT_LENGTH)
      } else {
        clean[key] = body[key]
      }
    }
  }
  return clean
}

// ─── POST /api/tickets ────────────────────────────────────────────────────────
router.post('/', requireRole('encargada', 'admin'), (req, res) => {
  try {
    const ticketData = sanitizeTicketData(req.body)

    if (!ticketData.categoria || !CATEGORIAS_VALIDAS.includes(ticketData.categoria)) {
      return res.status(400).json({ error: 'Categoría inválida' })
    }

    const folio = generateFolio()
    const now   = new Date().toISOString()
    const newId = genId()

    db.transaction(() => {
      db.prepare(`INSERT INTO tickets
        (id, folio, urgente, titulo, categoria, tipo_documento, folio_pvwin, folio_correcto,
         descripcion, detalle_falla, tipo_falla, tipo_traspaso,
         estado, sucursal_id, usuario_id, asignado_a, adjuntos, created_at, updated_at)
        VALUES (?,?,0,?,?,?,?,?,?,?,?,?,'abierto',?,?,null,'[]',?,?)`
      ).run(
        newId, folio,
        ticketData.titulo || '', ticketData.categoria,
        ticketData.tipo_documento || null, ticketData.folio_pvwin || null, ticketData.folio_correcto || null,
        ticketData.descripcion || '', ticketData.detalle_falla || null, ticketData.tipo_falla || null,
        ticketData.tipo_traspaso || null,
        req.user.sucursal_id, req.user.sub,
        now, now
      )

      db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
        .run(genId(), newId, req.user.sub, 'Ticket creado', `Reporte ${folio} creado por ${req.user.nombre}`, now)

      const regla = db.prepare('SELECT tecnico_ids FROM reglas_asignacion WHERE categoria = ?').get(ticketData.categoria)
      if (regla) {
        const ids = JSON.parse(regla.tecnico_ids || '[]')
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',')
          const tecnicos = db.prepare(`SELECT id, nombre FROM profiles WHERE id IN (${placeholders})`).all(...ids)

          if (tecnicos.length > 0) {
            const tecIds = tecnicos.map(t => t.id)
            db.prepare('UPDATE tickets SET asignado_a = ?, asignados_ids = ?, updated_at = ? WHERE id = ?')
              .run(tecIds[0], JSON.stringify(tecIds), now, newId)

            for (const tec of tecnicos) {
              crearNotificacion({
                usuario_id: tec.id,
                ticket_id: newId,
                mensaje: `Te asignaron el ticket ${folio}`,
                tipo: 'asignacion'
              })
            }

            db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
              .run(genId(), newId, req.user.sub, 'Asignación automática',
                   `Asignado a ${tecnicos.length} técnico(s): ${tecnicos.map(t => t.nombre).join(', ')}`, now)
          }
        }
      }
    })()

    const suc = db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(req.user.sucursal_id)
    notificarNuevoTicket({
      folio,
      titulo: ticketData.titulo || '',
      sucursal: suc?.nombre || req.user.sucursal_id,
      categoria: ticketData.categoria,
      descripcion: ticketData.descripcion || ''
    }).catch(() => {})

    const newTicket = stmtTicketById.get(newId)
    broadcast('ticket_nuevo', { id: newId, folio, sucursal: suc?.nombre, categoria: ticketData.categoria })
    return res.status(201).json(mapTicket(newTicket))

  } catch (err) {
    console.error('Error crearTicket:', err)
    res.status(500).json({ error: 'Error al crear el ticket' })
  }
})

// ─── GET /api/tickets/search?q=texto ──────────────────────────────────────────
router.get('/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json([])
    if (q.length < 2) return res.status(400).json({ error: 'Mínimo 2 caracteres' })

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const ftsQuery = q.split(/\s+/).map(w => `"${w.replace(/"/g, '""')}"*`).join(' ')

    let rows
    if (req.user.rol === 'encargada') {
      rows = db.prepare(`
        SELECT t.*, s.nombre as _sucursal_nombre, p.nombre as _usuario_nombre, p.rol as _usuario_rol, r.nombre as _resuelto_por_nombre, rank
        FROM tickets_fts fts
        JOIN tickets t ON fts.ticket_id = t.id
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN profiles p ON t.usuario_id = p.id
        LEFT JOIN profiles r ON t.resuelto_por_id = r.id
        WHERE tickets_fts MATCH ? AND t.sucursal_id = ?
        ORDER BY rank LIMIT ?
      `).all(ftsQuery, req.user.sucursal_id, limit)
    } else {
      rows = db.prepare(`
        SELECT t.*, s.nombre as _sucursal_nombre, p.nombre as _usuario_nombre, p.rol as _usuario_rol, r.nombre as _resuelto_por_nombre, rank
        FROM tickets_fts fts
        JOIN tickets t ON fts.ticket_id = t.id
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN profiles p ON t.usuario_id = p.id
        LEFT JOIN profiles r ON t.resuelto_por_id = r.id
        WHERE tickets_fts MATCH ?
        ORDER BY rank LIMIT ?
      `).all(ftsQuery, limit)
    }

    return res.json(enrichAsignados(rows.map(mapTicket)))

  } catch (err) {
    // Fallback LIKE si FTS falla
    try {
      const q = (req.query.q || '').trim()
      const like = `%${q}%`
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
      const rows = db.prepare(`
        ${TICKET_SELECT}
        WHERE t.titulo LIKE ? OR t.descripcion LIKE ? OR t.folio LIKE ?
        ORDER BY t.created_at DESC LIMIT ?
      `).all(like, like, like, limit)
      return res.json(enrichAsignados(rows.map(mapTicket)))
    } catch (e) {
      console.error('Error search:', e)
      res.status(500).json({ error: 'Error en la búsqueda' })
    }
  }
})

// ─── POST /api/tickets/check-duplicados ───────────────────────────────────────
router.post('/check-duplicados', (req, res) => {
  try {
    const { titulo, descripcion, categoria, sucursal_id } = req.body
    if (!titulo?.trim()) return res.json({ duplicados: [] })

    const texto = `${titulo} ${descripcion || ''}`.trim()
    if (texto.length < 5) return res.json({ duplicados: [] })

    // Encargadas solo pueden buscar duplicados en su propia sucursal
    const sid = req.user.rol === 'encargada'
      ? req.user.sucursal_id
      : (sucursal_id || req.user.sucursal_id)
    const palabras = texto.toLowerCase().split(/\s+/).filter(w => w.length >= 3).slice(0, 5)
    if (palabras.length === 0) return res.json({ duplicados: [] })

    const conditions = palabras.map(() => `(LOWER(t.titulo) LIKE ? OR LOWER(t.descripcion) LIKE ? OR LOWER(t.detalle_falla) LIKE ?)`)
    const params = palabras.flatMap(w => [`%${w}%`, `%${w}%`, `%${w}%`])

    const duplicados = db.prepare(`
      SELECT t.id, t.folio, t.titulo, t.categoria, t.estado, t.created_at, s.nombre as sucursal_nombre
      FROM tickets t LEFT JOIN sucursales s ON t.sucursal_id = s.id
      WHERE t.estado IN ('abierto', 'en_proceso') AND t.sucursal_id = ?
        AND (${conditions.join(' OR ')})
      ORDER BY t.created_at DESC LIMIT 5
    `).all(sid, ...params)

    return res.json({ duplicados: duplicados.map(d => ({
      id: d.id, folio: d.folio, titulo: d.titulo, categoria: d.categoria,
      estado: d.estado, created_at: d.created_at, sucursal: d.sucursal_nombre
    })) })

  } catch (err) {
    console.error('Error checkDuplicados:', err)
    res.json({ duplicados: [] })
  }
})

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const ticket = stmtTicketById.get(req.params.id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    if (req.user.rol === 'encargada' && ticket.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    return res.json(enrichAsignados([mapTicket(ticket)])[0])

  } catch (err) {
    console.error('Error getTicket:', err)
    res.status(500).json({ error: 'Error al obtener el ticket' })
  }
})

// ─── PUT /api/tickets/:id/estado ──────────────────────────────────────────────
router.put('/:id/estado', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['abierto', 'en_proceso', 'resuelto', 'cerrado']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const estadoLabels = { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    const now = new Date().toISOString()
    let resuelto_por_id = ticket.resuelto_por_id
    let resuelto_at = ticket.resuelto_at
    let cerrado_por_id = ticket.cerrado_por_id
    let cerrado_at = ticket.cerrado_at
    let reabierto_por_id = ticket.reabierto_por_id
    let reabierto_at = ticket.reabierto_at

    if (estado === 'resuelto') {
      if (!ticket.resuelto_por_id) {
        resuelto_por_id = req.user.sub
        resuelto_at = now
      }
    }
    if (estado === 'cerrado') {
      cerrado_por_id = req.user.sub
      cerrado_at = now
    }
    if (estado === 'abierto') {
      // Si venía de un estado terminal, registrar reapertura
      if (ticket.estado === 'resuelto' || ticket.estado === 'cerrado') {
        reabierto_por_id = req.user.sub
        reabierto_at = now
      }
      resuelto_por_id = null
      resuelto_at = null
      cerrado_por_id = null
      cerrado_at = null
    }

    // Al resolver, quitar urgencia automáticamente
    const urgente = estado === 'resuelto' ? 0 : ticket.urgente

    db.prepare(`UPDATE tickets SET estado=?, updated_at=?, resuelto_por_id=?, resuelto_at=?,
                cerrado_por_id=?, cerrado_at=?, reabierto_por_id=?, reabierto_at=?, urgente=?
                WHERE id=?`)
      .run(estado, now, resuelto_por_id, resuelto_at,
           cerrado_por_id, cerrado_at, reabierto_por_id, reabierto_at, urgente, id)

    db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
      .run(genId(), id, req.user.sub, 'Estado actualizado', `Estado cambiado a: ${estadoLabels[estado]}`, now)

    // Notificar al creador (in-app)
    if (ticket.usuario_id && ticket.usuario_id !== req.user.sub) {
      const esResuelto = estado === 'resuelto'
      crearNotificacion({
        usuario_id: ticket.usuario_id,
        ticket_id: id,
        mensaje: esResuelto
          ? `✔ Reporte ${ticket.folio} resuelto por ${req.user.nombre}`
          : `Tu reporte ${ticket.folio} cambió a: ${estadoLabels[estado]}`,
        tipo: esResuelto ? 'resuelto' : 'estado'
      })
    }

    // Notificar por email a la sucursal
    const suc = db.prepare('SELECT nombre, email, email_notificaciones FROM sucursales WHERE id = ?').get(ticket.sucursal_id)
    if (suc?.email_notificaciones && suc?.email) {
      const tecnicoNombre = resuelto_por_id
        ? db.prepare('SELECT nombre FROM profiles WHERE id = ?').get(resuelto_por_id)?.nombre
        : null
      notificarCambioEstado({ to: suc.email, folio: ticket.folio, titulo: ticket.titulo, sucursal: suc.nombre, estado, tecnico: tecnicoNombre }).catch(() => {})
    }

    const updated = stmtTicketById.get(id)
    broadcast('ticket_actualizado', { id, estado })
    return res.json(mapTicket(updated))

  } catch (err) {
    console.error('Error actualizarEstado:', err)
    res.status(500).json({ error: 'Error al actualizar el estado' })
  }
})

// ─── PUT /api/tickets/:id/urgente ─────────────────────────────────────────────
router.put('/:id/urgente', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const { id } = req.params
    let { urgente } = req.body

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    if (typeof urgente !== 'boolean') {
      urgente = urgente === true || urgente === 'true' || urgente === 1 || urgente === '1'
    }

    const now = new Date().toISOString()
    const urgentePorId = urgente ? req.user.sub : null
    const urgenteAt = urgente ? now : null
    db.prepare('UPDATE tickets SET urgente=?, urgente_por_id=?, urgente_at=?, updated_at=? WHERE id=?')
      .run(urgente ? 1 : 0, urgentePorId, urgenteAt, now, id)

    db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
      .run(genId(), id, req.user.sub,
        urgente ? 'Marcado como urgente' : 'Urgencia removida',
        urgente ? `Marcado como urgente por ${req.user.nombre}` : `Urgencia removida por ${req.user.nombre}`,
        now)

    const updated = stmtTicketById.get(id)
    return res.json(mapTicket(updated))

  } catch (err) {
    console.error('Error toggleUrgente:', err)
    res.status(500).json({ error: 'Error al actualizar urgencia' })
  }
})

// ─── GET /api/tickets/:id/comentarios ─────────────────────────────────────────
router.get('/:id/comentarios', (req, res) => {
  try {
    const ticket = db.prepare('SELECT sucursal_id FROM tickets WHERE id = ?').get(req.params.id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })
    if (req.user.rol === 'encargada' && ticket.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    const rows = stmtComentarios.all(req.params.id)
    return res.json(rows.map(mapComment))
  } catch (err) {
    console.error('Error getComentarios:', err)
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
})

// ─── POST /api/tickets/:id/comentarios ────────────────────────────────────────
router.post('/:id/comentarios', (req, res) => {
  try {
    const { id } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' })
    }
    if (contenido.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `El comentario no puede exceder ${MAX_TEXT_LENGTH} caracteres` })
    }

    const ticketCheck = db.prepare('SELECT sucursal_id FROM tickets WHERE id = ?').get(id)
    if (!ticketCheck) return res.status(404).json({ error: 'Ticket no encontrado' })
    if (req.user.rol === 'encargada' && ticketCheck.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const now = new Date().toISOString()
    const newId = genId()

    db.prepare('INSERT INTO comentarios (id, ticket_id, usuario_id, contenido, created_at) VALUES (?,?,?,?,?)')
      .run(newId, id, req.user.sub, contenido.trim(), now)

    // Notificar al creador del ticket y a todos los técnicos asignados
    const ticketObj = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
    if (ticketObj) {
      const destinatarios = new Set()
      if (ticketObj.usuario_id && ticketObj.usuario_id !== req.user.sub) destinatarios.add(ticketObj.usuario_id)
      for (const tid of parseAsignados(ticketObj.asignados_ids)) {
        if (tid && tid !== req.user.sub) destinatarios.add(tid)
      }
      if (ticketObj.asignado_a && ticketObj.asignado_a !== req.user.sub) destinatarios.add(ticketObj.asignado_a)
      for (const uid of destinatarios) {
        crearNotificacion({
          usuario_id: uid,
          ticket_id: id,
          mensaje: `Nuevo comentario en ${ticketObj.folio} de ${req.user.nombre}`,
          tipo: 'comentario'
        })
      }
    }

    // Email a la sucursal cuando un técnico comenta
    if (ticketObj && req.user.rol !== 'encargada') {
      const suc = db.prepare('SELECT nombre, email, email_notificaciones FROM sucursales WHERE id = ?').get(ticketObj.sucursal_id)
      if (suc?.email_notificaciones && suc?.email) {
        notificarComentario({ to: suc.email, folio: ticketObj.folio, titulo: ticketObj.titulo, sucursal: suc.nombre, comentario: contenido.trim(), tecnico: req.user.nombre }).catch(() => {})
      }
    }

    const newCom = db.prepare('SELECT * FROM comentarios WHERE id = ?').get(newId)
    const profile = db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(req.user.sub)
    return res.status(201).json({ ...newCom, profiles: profile || null })

  } catch (err) {
    console.error('Error agregarComentario:', err)
    res.status(500).json({ error: 'Error al agregar comentario' })
  }
})

// ─── GET /api/tickets/:id/historial ───────────────────────────────────────────
router.get('/:id/historial', (req, res) => {
  try {
    const ticket = db.prepare('SELECT sucursal_id FROM tickets WHERE id = ?').get(req.params.id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })
    if (req.user.rol === 'encargada' && ticket.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    const historial = db.prepare('SELECT * FROM historial_tickets WHERE ticket_id = ? ORDER BY created_at DESC').all(req.params.id)
    return res.json(historial)
  } catch (err) {
    console.error('Error getHistorial:', err)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// ─── PUT /api/tickets/:id/asignar ─────────────────────────────────────────────
// Acepta `asignados_ids` (array, preferido) o `asignado_a` (legacy, single)
router.put('/:id/asignar', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const { id } = req.params
    let { asignados_ids, asignado_a } = req.body

    // Normalizar entrada: acepta ambos formatos
    let ids = []
    if (Array.isArray(asignados_ids)) {
      ids = asignados_ids.filter(Boolean)
    } else if (asignado_a) {
      ids = [asignado_a]
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    const now = new Date().toISOString()

    // Obtener nombres de los técnicos seleccionados
    let tecnicos = []
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      tecnicos = db.prepare(`SELECT id, nombre, email FROM profiles WHERE id IN (${placeholders})`).all(...ids)
    }

    const primero = tecnicos[0]?.id || null
    const asignadoPorId = tecnicos.length > 0 ? req.user.sub : null
    const asignadoAt = tecnicos.length > 0 ? now : null
    db.prepare('UPDATE tickets SET asignado_a=?, asignados_ids=?, asignado_por_id=?, asignado_at=?, updated_at=? WHERE id=?')
      .run(primero, JSON.stringify(tecnicos.map(t => t.id)), asignadoPorId, asignadoAt, now, id)

    db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
      .run(genId(), id, req.user.sub,
        tecnicos.length > 0 ? 'Técnicos asignados' : 'Asignación removida',
        tecnicos.length > 0
          ? `Asignado a ${tecnicos.map(t => t.nombre).join(', ')} por ${req.user.nombre}`
          : `Asignación removida por ${req.user.nombre}`,
        now)

    // Notificar y enviar email a cada técnico (excepto al propio usuario que asigna)
    const sucNombre = db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(ticket.sucursal_id)?.nombre || ''
    for (const tec of tecnicos) {
      if (tec.id === req.user.sub) continue
      crearNotificacion({
        usuario_id: tec.id,
        ticket_id: id,
        mensaje: `Te asignaron el ticket ${ticket.folio}: ${ticket.titulo}`,
        tipo: 'asignacion'
      })
      if (tec.email) {
        notificarAsignacion({ to: tec.email, folio: ticket.folio, titulo: ticket.titulo, sucursal: sucNombre }).catch(() => {})
      }
    }

    const updated = stmtTicketById.get(id)
    broadcast('ticket_actualizado', { id, asignado_a: primero, asignados_ids: tecnicos.map(t => t.id) })
    return res.json(enrichAsignados([mapTicket(updated)])[0])

  } catch (err) {
    console.error('Error asignarTecnico:', err)
    res.status(500).json({ error: 'Error al asignar técnico' })
  }
})

// ─── GET /api/tickets/:id/notas ───────────────────────────────────────────────
router.get('/:id/notas', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const rows = stmtNotas.all(req.params.id)
    return res.json(rows.map(mapNota))
  } catch (err) {
    console.error('Error getNotas:', err)
    res.status(500).json({ error: 'Error al obtener notas internas' })
  }
})

// ─── POST /api/tickets/:id/notas ──────────────────────────────────────────────
router.post('/:id/notas', requireRole('soporte', 'admin'), (req, res) => {
  try {
    const { id } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' })
    }
    if (contenido.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `La nota no puede exceder ${MAX_TEXT_LENGTH} caracteres` })
    }

    const newId = genId()
    const now = new Date().toISOString()

    db.prepare('INSERT INTO notas_internas (id, ticket_id, usuario_id, contenido, created_at) VALUES (?,?,?,?,?)')
      .run(newId, id, req.user.sub, contenido.trim(), now)

    const nota = db.prepare('SELECT * FROM notas_internas WHERE id = ?').get(newId)
    const profile = db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(req.user.sub)
    return res.status(201).json({ ...nota, profiles: profile || null })

  } catch (err) {
    console.error('Error crearNota:', err)
    res.status(500).json({ error: 'Error al crear nota interna' })
  }
})

// ─── DELETE /api/tickets/:id (solo admin) ────────────────────────────────────
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params
    const ticket = db.prepare('SELECT id, folio FROM tickets WHERE id = ?').get(id)
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    // Limpiar archivos físicos antes de borrar el ticket
    const adjuntos = db.prepare('SELECT filename FROM adjuntos WHERE ticket_id = ?').all(id)
    for (const adj of adjuntos) {
      const filePath = path.resolve(UPLOADS_DIR, path.basename(adj.filename))
      if (filePath.startsWith(UPLOADS_DIR + path.sep) && existsSync(filePath)) {
        try { unlinkSync(filePath) } catch { /* ignorar si falla */ }
      }
    }

    db.prepare('DELETE FROM notificaciones WHERE ticket_id = ?').run(id)
    db.prepare('DELETE FROM tickets WHERE id = ?').run(id)

    logAudit({ usuario_id: req.user.sub, usuario_nombre: req.user.nombre, accion: 'ELIMINAR_TICKET', entidad: 'ticket', entidad_id: id, detalle: `Folio ${ticket.folio} eliminado`, ip: req.ip })

    return res.json({ ok: true, folio: ticket.folio })
  } catch (err) {
    console.error('Error deleteTicket:', err)
    res.status(500).json({ error: 'Error al eliminar el ticket' })
  }
})

export default router
