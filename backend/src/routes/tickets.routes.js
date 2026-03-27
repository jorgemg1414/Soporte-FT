import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import db, { generateFolio, genId } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { crearNotificacion } from './notificaciones.routes.js'

const router = Router()

router.use(authenticate)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ticketWithJoins(t) {
  if (!t) return null
  const suc = t.sucursal_id ? db.prepare('SELECT id, nombre FROM sucursales WHERE id = ?').get(t.sucursal_id) : null
  const profile = t.usuario_id ? db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(t.usuario_id) : null
  const resuelto = t.resuelto_por_id ? db.prepare('SELECT id, nombre FROM profiles WHERE id = ?').get(t.resuelto_por_id) : null
  return {
    ...t,
    urgente: !!t.urgente,
    adjuntos: JSON.parse(t.adjuntos || '[]'),
    sucursales: suc || null,
    profiles: profile || null,
    resuelto_por: resuelto || null
  }
}

function commentWithJoins(c) {
  const profile = db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(c.usuario_id)
  return { ...c, profiles: profile || null }
}

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      let tickets
      if (req.user.rol === 'encargada') {
        tickets = db.prepare('SELECT * FROM tickets WHERE sucursal_id = ? ORDER BY created_at DESC').all(req.user.sucursal_id)
      } else {
        tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all()
      }
      return res.json(tickets.map(ticketWithJoins))
    }

    let query = supabase
      .from('tickets')
      .select('*, sucursales(nombre), profiles(nombre)')
      .order('created_at', { ascending: false })

    if (req.user.rol === 'encargada') {
      query = query.eq('sucursal_id', req.user.sucursal_id)
    }

    const { data, error } = await query
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error fetchTickets:', err)
    res.status(500).json({ error: 'Error al obtener tickets' })
  }
})

// ─── GET /api/tickets/stats ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    let tickets

    if (isMock) {
      if (req.user.rol === 'encargada') {
        tickets = db.prepare('SELECT * FROM tickets WHERE sucursal_id = ?').all(req.user.sucursal_id)
      } else {
        tickets = db.prepare('SELECT * FROM tickets').all()
      }
      tickets = tickets.map(t => {
        const suc = t.sucursal_id ? db.prepare('SELECT nombre FROM sucursales WHERE id = ?').get(t.sucursal_id) : null
        const res_por = t.resuelto_por_id ? db.prepare('SELECT nombre FROM profiles WHERE id = ?').get(t.resuelto_por_id) : null
        return {
          ...t,
          urgente: !!t.urgente,
          sucursal_nombre: suc?.nombre || '—',
          resuelto_por_nombre: res_por?.nombre || null
        }
      })
    } else {
      let query = supabase.from('tickets').select('estado, categoria, sucursal_id, created_at, sucursales(nombre)')
      if (req.user.rol === 'encargada') query = query.eq('sucursal_id', req.user.sucursal_id)
      const { data, error } = await query
      if (error) throw error
      tickets = (data || []).map(t => ({ ...t, sucursal_nombre: t.sucursales?.nombre || '—' }))
    }

    // ── Por estado ──
    const estados = { abiertos: 0, en_proceso: 0, resueltos: 0, cerrados: 0 }
    tickets.forEach(t => {
      if (t.estado === 'abierto')    estados.abiertos++
      if (t.estado === 'en_proceso') estados.en_proceso++
      if (t.estado === 'resuelto')   estados.resueltos++
      if (t.estado === 'cerrado')    estados.cerrados++
    })

    const catMap = {}
    tickets.forEach(t => { catMap[t.categoria] = (catMap[t.categoria] || 0) + 1 })
    const por_categoria = Object.entries(catMap).map(([cat, count]) => ({ categoria: cat, total: count }))

    const sucMap = {}
    tickets.forEach(t => { sucMap[t.sucursal_nombre] = (sucMap[t.sucursal_nombre] || 0) + 1 })
    const por_sucursal = Object.entries(sucMap)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const hoy = new Date()
    const diasMap = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(hoy.getDate() - i)
      diasMap[d.toISOString().slice(0, 10)] = 0
    }
    tickets.forEach(t => {
      const dia = t.created_at?.slice(0, 10)
      if (dia && diasMap[dia] !== undefined) diasMap[dia]++
    })
    const por_dia = Object.entries(diasMap).map(([fecha, total]) => ({ fecha, total }))

    const resueltos = tickets.filter(t => t.estado === 'resuelto' && t.resuelto_at && t.created_at)
    let tiempo_promedio_horas = null
    if (resueltos.length > 0) {
      const totalMs = resueltos.reduce((acc, t) => acc + (new Date(t.resuelto_at) - new Date(t.created_at)), 0)
      tiempo_promedio_horas = Math.round((totalMs / resueltos.length / 3600000) * 10) / 10
    }

    const tickets_urgentes = tickets.filter(t => t.urgente === true || t.urgente === 1).length

    const tecnicoMap = {}
    tickets.forEach(t => {
      if (t.estado === 'resuelto' && t.resuelto_por_nombre) {
        tecnicoMap[t.resuelto_por_nombre] = (tecnicoMap[t.resuelto_por_nombre] || 0) + 1
      }
    })
    const por_tecnico = Object.entries(tecnicoMap)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)

    return res.json({
      total: tickets.length,
      ...estados,
      tickets_urgentes,
      tiempo_promedio_horas,
      por_categoria,
      por_sucursal,
      por_dia,
      por_tecnico
    })

  } catch (err) {
    console.error('Error fetchStats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// Campos permitidos en creación de ticket (whitelist)
const TICKET_ALLOWED_FIELDS = [
  'titulo', 'categoria', 'descripcion', 'tipo_documento', 'folio_pvwin',
  'folio_correcto', 'detalle_falla', 'tipo_falla', 'foto_cancelar',
  'foto_correcto', 'tipo_traspaso'
]
const CATEGORIAS_VALIDAS = ['cancelacion_documento', 'falla_pvwin', 'falla_computadora', 'otro']
const MAX_TEXT_LENGTH = 2000

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
router.post('/', requireRole('encargada', 'admin'), async (req, res) => {
  try {
    const ticketData = sanitizeTicketData(req.body)

    if (!ticketData.categoria || !CATEGORIAS_VALIDAS.includes(ticketData.categoria)) {
      return res.status(400).json({ error: 'Categoría inválida' })
    }

    if (isMock) {
      const folio = generateFolio()
      const now   = new Date().toISOString()
      const newId = genId()

      db.prepare(`INSERT INTO tickets
        (id, folio, urgente, titulo, categoria, tipo_documento, folio_pvwin, folio_correcto,
         descripcion, detalle_falla, tipo_falla, tipo_traspaso, foto_cancelar, foto_correcto,
         estado, sucursal_id, usuario_id, asignado_a, adjuntos, created_at, updated_at)
        VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?,?,'abierto',?,?,null,'[]',?,?)`
      ).run(
        newId, folio,
        ticketData.titulo || '', ticketData.categoria,
        ticketData.tipo_documento || null, ticketData.folio_pvwin || null, ticketData.folio_correcto || null,
        ticketData.descripcion || '', ticketData.detalle_falla || null, ticketData.tipo_falla || null,
        ticketData.tipo_traspaso || null, ticketData.foto_cancelar || null, ticketData.foto_correcto || null,
        req.user.sucursal_id, req.user.sub,
        now, now
      )

      db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
        .run(genId(), newId, req.user.sub, 'Ticket creado', `Reporte ${folio} creado por ${req.user.nombre}`, now)

      const newTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(newId)
      return res.status(201).json(ticketWithJoins(newTicket))
    }

    // Supabase
    const { data: folioData, error: folioError } = await supabase.rpc('generate_ticket_folio')
    if (folioError) throw folioError

    const { data, error } = await supabase
      .from('tickets')
      .insert({ ...ticketData, folio: folioData, usuario_id: req.user.sub, sucursal_id: req.user.sucursal_id })
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error

    await supabase.from('historial_tickets').insert({
      ticket_id: data.id, usuario_id: req.user.sub,
      accion: 'Ticket creado', detalle: `Reporte ${data.folio} creado por ${req.user.nombre}`
    })

    return res.status(201).json(data)

  } catch (err) {
    console.error('Error crearTicket:', err)
    res.status(500).json({ error: 'Error al crear el ticket' })
  }
})

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

      if (req.user.rol === 'encargada' && ticket.sucursal_id !== req.user.sucursal_id) {
        return res.status(403).json({ error: 'Sin permisos' })
      }

      return res.json(ticketWithJoins(ticket))
    }

    const { data, error } = await supabase
      .from('tickets').select('*, sucursales(nombre), profiles(nombre)').eq('id', id).single()
    if (error) return res.status(404).json({ error: 'Ticket no encontrado' })
    if (req.user.rol === 'encargada' && data.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    return res.json(data)

  } catch (err) {
    console.error('Error getTicket:', err)
    res.status(500).json({ error: 'Error al obtener el ticket' })
  }
})

// ─── PUT /api/tickets/:id/estado ──────────────────────────────────────────────
router.put('/:id/estado', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['abierto', 'en_proceso', 'resuelto', 'cerrado']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const estadoLabels = { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }

    if (isMock) {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      let resuelto_por_id = ticket.resuelto_por_id
      let resuelto_at = ticket.resuelto_at
      if (estado === 'resuelto') { resuelto_por_id = req.user.sub; resuelto_at = now }
      if (estado === 'abierto')  { resuelto_por_id = null; resuelto_at = null }

      db.prepare('UPDATE tickets SET estado=?, updated_at=?, resuelto_por_id=?, resuelto_at=? WHERE id=?')
        .run(estado, now, resuelto_por_id, resuelto_at, id)

      db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
        .run(genId(), id, req.user.sub, 'Estado actualizado', `Estado cambiado a: ${estadoLabels[estado]}`, now)

      // Notificar al creador
      if (ticket.usuario_id && ticket.usuario_id !== req.user.sub) {
        crearNotificacion({
          usuario_id: ticket.usuario_id,
          ticket_id: id,
          mensaje: `Tu ticket ${ticket.folio} cambió a: ${estadoLabels[estado]}`,
          tipo: 'estado'
        })
      }

      const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      return res.json(ticketWithJoins(updated))
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error

    await supabase.from('historial_tickets').insert({
      ticket_id: id, usuario_id: req.user.sub,
      accion: 'Estado actualizado', detalle: `Estado cambiado a: ${estadoLabels[estado]}`
    })

    return res.json(data)

  } catch (err) {
    console.error('Error actualizarEstado:', err)
    res.status(500).json({ error: 'Error al actualizar el estado' })
  }
})

// ─── PUT /api/tickets/:id/urgente ─────────────────────────────────────────────
router.put('/:id/urgente', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { urgente } = req.body

    if (isMock) {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      db.prepare('UPDATE tickets SET urgente=?, updated_at=? WHERE id=?').run(urgente ? 1 : 0, now, id)

      db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
        .run(genId(), id, req.user.sub,
          urgente ? 'Marcado como urgente' : 'Urgencia removida',
          urgente ? `Marcado como urgente por ${req.user.nombre}` : `Urgencia removida por ${req.user.nombre}`,
          now)

      const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      return res.json(ticketWithJoins(updated))
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({ urgente: !!urgente, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error toggleUrgente:', err)
    res.status(500).json({ error: 'Error al actualizar urgencia' })
  }
})

// ─── GET /api/tickets/:id/comentarios ─────────────────────────────────────────
router.get('/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const comentarios = db.prepare('SELECT * FROM comentarios WHERE ticket_id = ? ORDER BY created_at ASC').all(id)
      return res.json(comentarios.map(commentWithJoins))
    }

    const { data, error } = await supabase
      .from('comentarios').select('*, profiles(nombre, rol)').eq('ticket_id', id).order('created_at')
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getComentarios:', err)
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
})

// ─── POST /api/tickets/:id/comentarios ────────────────────────────────────────
router.post('/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' })
    }
    if (contenido.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `El comentario no puede exceder ${MAX_TEXT_LENGTH} caracteres` })
    }

    if (isMock) {
      const now = new Date().toISOString()
      const newId = genId()

      db.prepare('INSERT INTO comentarios (id, ticket_id, usuario_id, contenido, created_at) VALUES (?,?,?,?,?)')
        .run(newId, id, req.user.sub, contenido.trim(), now)

      // Notificar al creador del ticket y al técnico asignado
      const ticketObj = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      if (ticketObj) {
        const destinatarios = new Set()
        if (ticketObj.usuario_id && ticketObj.usuario_id !== req.user.sub) destinatarios.add(ticketObj.usuario_id)
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

      const newCom = db.prepare('SELECT * FROM comentarios WHERE id = ?').get(newId)
      return res.status(201).json(commentWithJoins(newCom))
    }

    const { data, error } = await supabase
      .from('comentarios')
      .insert({ ticket_id: id, usuario_id: req.user.sub, contenido: contenido.trim() })
      .select('*, profiles(nombre, rol)')
      .single()

    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error agregarComentario:', err)
    res.status(500).json({ error: 'Error al agregar comentario' })
  }
})

// ─── GET /api/tickets/:id/historial ───────────────────────────────────────────
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const historial = db.prepare('SELECT * FROM historial_tickets WHERE ticket_id = ? ORDER BY created_at DESC').all(id)
      return res.json(historial)
    }

    const { data, error } = await supabase
      .from('historial_tickets').select('*').eq('ticket_id', id).order('created_at', { ascending: false })
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getHistorial:', err)
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

// ─── PUT /api/tickets/:id/asignar ─────────────────────────────────────────────
router.put('/:id/asignar', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { asignado_a } = req.body

    if (isMock) {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      const tecnico = asignado_a ? db.prepare('SELECT nombre FROM profiles WHERE id = ?').get(asignado_a) : null

      db.prepare('UPDATE tickets SET asignado_a=?, updated_at=? WHERE id=?').run(asignado_a || null, now, id)

      db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
        .run(genId(), id, req.user.sub,
          asignado_a ? 'Técnico asignado' : 'Asignación removida',
          asignado_a
            ? `Asignado a ${tecnico?.nombre || 'desconocido'} por ${req.user.nombre}`
            : `Asignación removida por ${req.user.nombre}`,
          now)

      if (asignado_a && asignado_a !== req.user.sub) {
        crearNotificacion({
          usuario_id: asignado_a,
          ticket_id: id,
          mensaje: `Te asignaron el ticket ${ticket.folio}: ${ticket.titulo}`,
          tipo: 'asignacion'
        })
      }

      const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
      return res.json(ticketWithJoins(updated))
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({ asignado_a: asignado_a || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error asignarTecnico:', err)
    res.status(500).json({ error: 'Error al asignar técnico' })
  }
})

// ─── GET /api/tickets/:id/notas ───────────────────────────────────────────────
router.get('/:id/notas', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const notas = db.prepare('SELECT * FROM notas_internas WHERE ticket_id = ? ORDER BY created_at ASC').all(id)
      return res.json(notas.map(n => {
        const profile = db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(n.usuario_id)
        return { ...n, profiles: profile || null }
      }))
    }

    const { data, error } = await supabase
      .from('notas_internas').select('*, profiles(nombre, rol)').eq('ticket_id', id).order('created_at')
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getNotas:', err)
    res.status(500).json({ error: 'Error al obtener notas internas' })
  }
})

// ─── POST /api/tickets/:id/notas ──────────────────────────────────────────────
router.post('/:id/notas', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' })
    }
    if (contenido.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `La nota no puede exceder ${MAX_TEXT_LENGTH} caracteres` })
    }

    if (isMock) {
      const newId = genId()
      const now = new Date().toISOString()

      db.prepare('INSERT INTO notas_internas (id, ticket_id, usuario_id, contenido, created_at) VALUES (?,?,?,?,?)')
        .run(newId, id, req.user.sub, contenido.trim(), now)

      const nota = db.prepare('SELECT * FROM notas_internas WHERE id = ?').get(newId)
      const profile = db.prepare('SELECT id, nombre, rol FROM profiles WHERE id = ?').get(req.user.sub)
      return res.status(201).json({ ...nota, profiles: profile || null })
    }

    const { data, error } = await supabase
      .from('notas_internas')
      .insert({ ticket_id: id, usuario_id: req.user.sub, contenido: contenido.trim() })
      .select('*, profiles(nombre, rol)')
      .single()

    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error crearNota:', err)
    res.status(500).json({ error: 'Error al crear nota interna' })
  }
})

export default router
