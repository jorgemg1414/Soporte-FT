import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, generateFolio, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// Todos los endpoints requieren autenticación
router.use(authenticate)

// ─── Helpers para el mock ────────────────────────────────────────────────────

function applyTicketJoins(ticket, store) {
  return {
    ...ticket,
    sucursales: store.sucursales.find(s => s.id === ticket.sucursal_id) || null,
    profiles:   store.profiles.find(p => p.id === ticket.usuario_id)   || null
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
    if (isMock) {
      const store = getStore()
      let tickets = store.tickets

      if (req.user.rol === 'encargada') {
        tickets = tickets.filter(t => t.sucursal_id === req.user.sucursal_id)
      }

      return res.json({
        total:     tickets.length,
        abiertos:  tickets.filter(t => t.estado === 'abierto').length,
        en_proceso:tickets.filter(t => t.estado === 'en_proceso').length,
        resueltos: tickets.filter(t => t.estado === 'resuelto').length,
        cerrados:  tickets.filter(t => t.estado === 'cerrado').length
      })
    }

    // Supabase
    let query = supabase.from('tickets').select('estado')
    if (req.user.rol === 'encargada') {
      query = query.eq('sucursal_id', req.user.sucursal_id)
    }

    const { data, error } = await query
    if (error) throw error

    const tickets = data || []
    return res.json({
      total:     tickets.length,
      abiertos:  tickets.filter(t => t.estado === 'abierto').length,
      en_proceso:tickets.filter(t => t.estado === 'en_proceso').length,
      resueltos: tickets.filter(t => t.estado === 'resuelto').length,
      cerrados:  tickets.filter(t => t.estado === 'cerrado').length
    })

  } catch (err) {
    console.error('Error fetchStats:', err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// ─── POST /api/tickets ───────────────────────────────────────────────────────
router.post('/', requireRole('encargada', 'admin'), async (req, res) => {
  try {
    const ticketData = req.body

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
      store.tickets[idx] = { ...store.tickets[idx], estado, updated_at: now }

      store.historial_tickets.push({
        id:         genId(),
        ticket_id:  id,
        usuario_id: req.user.sub,
        accion:     'Estado actualizado',
        detalle:    `Estado cambiado a: ${estadoLabels[estado]}`,
        created_at: now
      })

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
      saveStore(store)

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

export default router
