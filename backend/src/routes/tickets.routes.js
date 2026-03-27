import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, generateFolio, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { crearNotificacion } from './notificaciones.routes.js'

const router = Router()

// Todos los endpoints requieren autenticación
router.use(authenticate)

// ─── Helpers para el mock ────────────────────────────────────────────────────

function applyTicketJoins(ticket, store) {
  const suc = store.sucursales.find(s => s.id === ticket.sucursal_id) || null
  return {
    ...ticket,
    sucursales:   suc ? { id: suc.id, nombre: suc.nombre } : null,
    profiles:     store.profiles.find(p => p.id === ticket.usuario_id)         || null,
    resuelto_por: ticket.resuelto_por_id
      ? store.profiles.find(p => p.id === ticket.resuelto_por_id) || null
      : null
  }
}

function applyComentarioJoins(comentario, store) {
  const profile = store.profiles.find(p => p.id === comentario.usuario_id) || null
  return { ...comentario, profiles: profile }
}

// ─── GET /api/tickets ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      let tickets = store.tickets

      if (req.user.rol === 'encargada') {
        tickets = tickets.filter(t => t.sucursal_id === req.user.sucursal_id)
      }

      // Ordenar por created_at descendente
      tickets = [...tickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      const withJoins = tickets.map(t => applyTicketJoins(t, store))
      return res.json(withJoins)
    }

    // Supabase
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

// ─── GET /api/tickets/stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    let tickets

    if (isMock) {
      const store = getStore()
      tickets = store.tickets
      if (req.user.rol === 'encargada') {
        tickets = tickets.filter(t => t.sucursal_id === req.user.sucursal_id)
      }
      tickets = tickets.map(t => ({
        ...t,
        sucursal_nombre:    store.sucursales.find(s => s.id === t.sucursal_id)?.nombre || '—',
        resuelto_por_nombre: t.resuelto_por_id
          ? store.profiles.find(p => p.id === t.resuelto_por_id)?.nombre || '—'
          : null
      }))
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

    // ── Por categoría ──
    const catMap = {}
    tickets.forEach(t => { catMap[t.categoria] = (catMap[t.categoria] || 0) + 1 })
    const por_categoria = Object.entries(catMap).map(([cat, count]) => ({ categoria: cat, total: count }))

    // ── Por sucursal (top 10) ──
    const sucMap = {}
    tickets.forEach(t => { sucMap[t.sucursal_nombre] = (sucMap[t.sucursal_nombre] || 0) + 1 })
    const por_sucursal = Object.entries(sucMap)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // ── Por día (últimos 14 días) ──
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

    // ── Tiempo promedio de resolución (horas) ──
    const resueltos = tickets.filter(t => t.estado === 'resuelto' && t.resuelto_at && t.created_at)
    let tiempo_promedio_horas = null
    if (resueltos.length > 0) {
      const totalMs = resueltos.reduce((acc, t) => acc + (new Date(t.resuelto_at) - new Date(t.created_at)), 0)
      tiempo_promedio_horas = Math.round((totalMs / resueltos.length / 3600000) * 10) / 10
    }

    // ── Tickets urgentes (solo marcados manualmente) ──
    const tickets_urgentes = tickets.filter(t => t.urgente === true).length

    // ── Por técnico (tickets resueltos) ──
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
      // Truncar strings largos
      if (typeof body[key] === 'string' && body[key].length > MAX_TEXT_LENGTH) {
        clean[key] = body[key].slice(0, MAX_TEXT_LENGTH)
      } else {
        clean[key] = body[key]
      }
    }
  }
  return clean
}

// ─── POST /api/tickets ───────────────────────────────────────────────────────
router.post('/', requireRole('encargada', 'admin'), async (req, res) => {
  try {
    const ticketData = sanitizeTicketData(req.body)

    // Validar categoría
    if (!ticketData.categoria || !CATEGORIAS_VALIDAS.includes(ticketData.categoria)) {
      return res.status(400).json({ error: 'Categoría inválida' })
    }

    if (isMock) {
      const store  = getStore()
      const folio  = generateFolio()
      const now    = new Date().toISOString()
      const newId  = genId()

      const newTicket = {
        id:           newId,
        folio,
        created_at:   now,
        updated_at:   now,
        estado:       'abierto',
        urgente:      false,
        usuario_id:   req.user.sub,
        sucursal_id:  req.user.sucursal_id,
        ...ticketData
      }

      store.tickets.push(newTicket)

      store.historial_tickets.push({
        id:         genId(),
        ticket_id:  newId,
        usuario_id: req.user.sub,
        accion:     'Ticket creado',
        detalle:    `Reporte ${folio} creado por ${req.user.nombre}`,
        created_at: now
      })

      saveStore(store)

      const withJoins = applyTicketJoins(newTicket, store)
      return res.status(201).json(withJoins)
    }

    // Supabase
    const { data: folioData, error: folioError } = await supabase.rpc('generate_ticket_folio')
    if (folioError) throw folioError

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ...ticketData,
        folio:       folioData,
        usuario_id:  req.user.sub,
        sucursal_id: req.user.sucursal_id
      })
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error

    await supabase.from('historial_tickets').insert({
      ticket_id:  data.id,
      usuario_id: req.user.sub,
      accion:     'Ticket creado',
      detalle:    `Reporte ${data.folio} creado por ${req.user.nombre}`
    })

    return res.status(201).json(data)

  } catch (err) {
    console.error('Error crearTicket:', err)
    res.status(500).json({ error: 'Error al crear el ticket' })
  }
})

// ─── GET /api/tickets/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const store  = getStore()
      const ticket = store.tickets.find(t => t.id === id)
      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

      // Encargada solo puede ver sus propios tickets
      if (req.user.rol === 'encargada' && ticket.sucursal_id !== req.user.sucursal_id) {
        return res.status(403).json({ error: 'Sin permisos' })
      }

      return res.json(applyTicketJoins(ticket, store))
    }

    // Supabase
    const { data, error } = await supabase
      .from('tickets')
      .select('*, sucursales(nombre), profiles(nombre)')
      .eq('id', id)
      .single()

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

// ─── PUT /api/tickets/:id/estado ─────────────────────────────────────────────
router.put('/:id/estado', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['abierto', 'en_proceso', 'resuelto', 'cerrado']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' })
    }

    const estadoLabels = {
      abierto:    'Abierto',
      en_proceso: 'En Proceso',
      resuelto:   'Resuelto',
      cerrado:    'Cerrado'
    }

    if (isMock) {
      const store = getStore()
      const idx   = store.tickets.findIndex(t => t.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      const extra = {}
      if (estado === 'resuelto') { extra.resuelto_por_id = req.user.sub; extra.resuelto_at = now }
      if (estado === 'abierto')  { extra.resuelto_por_id = null; extra.resuelto_at = null }
      store.tickets[idx] = { ...store.tickets[idx], estado, updated_at: now, ...extra }

      store.historial_tickets.push({
        id:         genId(),
        ticket_id:  id,
        usuario_id: req.user.sub,
        accion:     'Estado actualizado',
        detalle:    `Estado cambiado a: ${estadoLabels[estado]}`,
        created_at: now
      })

      // Notificar al creador del ticket sobre el cambio de estado
      const ticketObj = store.tickets[idx]
      if (ticketObj.usuario_id && ticketObj.usuario_id !== req.user.sub) {
        crearNotificacion(store, {
          usuario_id: ticketObj.usuario_id,
          ticket_id: id,
          mensaje: `Tu ticket ${ticketObj.folio} cambió a: ${estadoLabels[estado]}`,
          tipo: 'estado'
        })
      }

      saveStore(store)

      return res.json(applyTicketJoins(store.tickets[idx], store))
    }

    // Supabase
    const { data, error } = await supabase
      .from('tickets')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, sucursales(nombre), profiles(nombre)')
      .single()

    if (error) throw error

    await supabase.from('historial_tickets').insert({
      ticket_id:  id,
      usuario_id: req.user.sub,
      accion:     'Estado actualizado',
      detalle:    `Estado cambiado a: ${estadoLabels[estado]}`
    })

    return res.json(data)

  } catch (err) {
    console.error('Error actualizarEstado:', err)
    res.status(500).json({ error: 'Error al actualizar el estado' })
  }
})

// ─── PUT /api/tickets/:id/urgente ────────────────────────────────────────────
router.put('/:id/urgente', requireRole('soporte', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { urgente } = req.body

    if (isMock) {
      const store = getStore()
      const idx = store.tickets.findIndex(t => t.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      store.tickets[idx] = { ...store.tickets[idx], urgente: !!urgente, updated_at: now }

      store.historial_tickets.push({
        id: genId(), ticket_id: id, usuario_id: req.user.sub,
        accion: urgente ? 'Marcado como urgente' : 'Urgencia removida',
        detalle: urgente ? `Marcado como urgente por ${req.user.nombre}` : `Urgencia removida por ${req.user.nombre}`,
        created_at: now
      })

      saveStore(store)
      return res.json(applyTicketJoins(store.tickets[idx], store))
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

// ─── GET /api/tickets/:id/comentarios ────────────────────────────────────────
router.get('/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const store = getStore()
      const comentarios = store.comentarios
        .filter(c => c.ticket_id === id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(c => applyComentarioJoins(c, store))
      return res.json(comentarios)
    }

    // Supabase
    const { data, error } = await supabase
      .from('comentarios')
      .select('*, profiles(nombre, rol)')
      .eq('ticket_id', id)
      .order('created_at')

    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getComentarios:', err)
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
})

// ─── POST /api/tickets/:id/comentarios ───────────────────────────────────────
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
      const store = getStore()
      const now   = new Date().toISOString()

      const newComentario = {
        id:         genId(),
        ticket_id:  id,
        usuario_id: req.user.sub,
        contenido:  contenido.trim(),
        created_at: now
      }

      store.comentarios.push(newComentario)

      // Notificar al creador del ticket y al técnico asignado
      const ticketObj = store.tickets.find(t => t.id === id)
      if (ticketObj) {
        const destinatarios = new Set()
        if (ticketObj.usuario_id && ticketObj.usuario_id !== req.user.sub) destinatarios.add(ticketObj.usuario_id)
        if (ticketObj.asignado_a && ticketObj.asignado_a !== req.user.sub) destinatarios.add(ticketObj.asignado_a)
        for (const uid of destinatarios) {
          crearNotificacion(store, {
            usuario_id: uid,
            ticket_id: id,
            mensaje: `Nuevo comentario en ${ticketObj.folio} de ${req.user.nombre}`,
            tipo: 'comentario'
          })
        }
      }

      saveStore(store)

      // ── Notificaciones por correo (descomentar cuando esté configurado el SMTP) ──
      // const ticketObj = store.tickets.find(t => t.id === id)
      // if (ticketObj && req.user.rol !== 'encargada') {
      //   const sucursal = store.sucursales.find(s => s.id === ticketObj.sucursal_id)
      //   notificarComentario({
      //     to:         sucursal?.email || '',
      //     folio:      ticketObj.folio,
      //     titulo:     ticketObj.titulo,
      //     sucursal:   sucursal?.nombre || '',
      //     comentario: contenido.trim(),
      //     tecnico:    req.user.nombre
      //   })
      // }

      return res.status(201).json(applyComentarioJoins(newComentario, store))
    }

    // Supabase
    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        ticket_id:  id,
        usuario_id: req.user.sub,
        contenido:  contenido.trim()
      })
      .select('*, profiles(nombre, rol)')
      .single()

    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error agregarComentario:', err)
    res.status(500).json({ error: 'Error al agregar comentario' })
  }
})

// ─── GET /api/tickets/:id/historial ──────────────────────────────────────────
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params

    if (isMock) {
      const store = getStore()
      const historial = store.historial_tickets
        .filter(h => h.ticket_id === id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return res.json(historial)
    }

    // Supabase
    const { data, error } = await supabase
      .from('historial_tickets')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })

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
      const store = getStore()
      const idx = store.tickets.findIndex(t => t.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Ticket no encontrado' })

      const now = new Date().toISOString()
      const tecnico = asignado_a ? store.profiles.find(p => p.id === asignado_a) : null

      store.tickets[idx] = { ...store.tickets[idx], asignado_a: asignado_a || null, updated_at: now }

      store.historial_tickets.push({
        id: genId(), ticket_id: id, usuario_id: req.user.sub,
        accion: asignado_a ? 'Técnico asignado' : 'Asignación removida',
        detalle: asignado_a
          ? `Asignado a ${tecnico?.nombre || 'desconocido'} por ${req.user.nombre}`
          : `Asignación removida por ${req.user.nombre}`,
        created_at: now
      })

      // Notificar al técnico asignado
      if (asignado_a && asignado_a !== req.user.sub) {
        crearNotificacion(store, {
          usuario_id: asignado_a,
          ticket_id: id,
          mensaje: `Te asignaron el ticket ${store.tickets[idx].folio}: ${store.tickets[idx].titulo}`,
          tipo: 'asignacion'
        })
      }

      saveStore(store)
      return res.json(applyTicketJoins(store.tickets[idx], store))
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
      const store = getStore()
      const notas = store.notas_internas
        .filter(n => n.ticket_id === id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(n => {
          const profile = store.profiles.find(p => p.id === n.usuario_id)
          return { ...n, profiles: profile || null }
        })
      return res.json(notas)
    }

    const { data, error } = await supabase
      .from('notas_internas')
      .select('*, profiles(nombre, rol)')
      .eq('ticket_id', id)
      .order('created_at')

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
      const store = getStore()
      const now = new Date().toISOString()

      const nuevaNota = {
        id: genId(),
        ticket_id: id,
        usuario_id: req.user.sub,
        contenido: contenido.trim(),
        created_at: now
      }

      store.notas_internas.push(nuevaNota)
      saveStore(store)

      const profile = store.profiles.find(p => p.id === req.user.sub)
      return res.status(201).json({ ...nuevaNota, profiles: profile || null })
    }

    const { data, error } = await supabase
      .from('notas_internas')
      .insert({
        ticket_id: id,
        usuario_id: req.user.sub,
        contenido: contenido.trim()
      })
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
