import { Router } from 'express'
import { isMock, supabase } from '../lib/supabase.js'
import { getStore, saveStore, genId } from '../data/mock.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// ─── GET /api/sugerencias ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (isMock) {
      const store = getStore()
      let sugerencias = store.sugerencias

      // Encargada solo ve las suyas
      if (req.user.rol === 'encargada') {
        sugerencias = sugerencias.filter(s => s.sucursal_id === req.user.sucursal_id)
      }

      sugerencias = [...sugerencias]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(s => {
          const suc = store.sucursales.find(su => su.id === s.sucursal_id)
          return { ...s, sucursal_nombre: suc?.nombre || '—' }
        })

      return res.json(sugerencias)
    }

    let query = supabase
      .from('sugerencias')
      .select('*, sucursales(nombre)')
      .order('created_at', { ascending: false })

    if (req.user.rol === 'encargada') {
      query = query.eq('sucursal_id', req.user.sucursal_id)
    }

    const { data, error } = await query
    if (error) throw error
    return res.json(data || [])

  } catch (err) {
    console.error('Error getSugerencias:', err)
    res.status(500).json({ error: 'Error al obtener sugerencias' })
  }
})

// ─── POST /api/sugerencias ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { contenido } = req.body

    if (!contenido?.trim()) {
      return res.status(400).json({ error: 'El contenido es requerido' })
    }
    if (contenido.length > 2000) {
      return res.status(400).json({ error: 'Máximo 2000 caracteres' })
    }

    if (isMock) {
      const store = getStore()
      const nueva = {
        id: genId(),
        usuario_id: req.user.sub,
        sucursal_id: req.user.sucursal_id || null,
        contenido: contenido.trim(),
        estado: 'pendiente',
        respuesta: null,
        created_at: new Date().toISOString()
      }
      store.sugerencias.push(nueva)
      saveStore(store)

      const suc = store.sucursales.find(s => s.id === nueva.sucursal_id)
      return res.status(201).json({ ...nueva, sucursal_nombre: suc?.nombre || '—' })
    }

    const { data, error } = await supabase
      .from('sugerencias')
      .insert({
        usuario_id: req.user.sub,
        sucursal_id: req.user.sucursal_id || null,
        contenido: contenido.trim()
      })
      .select('*, sucursales(nombre)')
      .single()

    if (error) throw error
    return res.status(201).json(data)

  } catch (err) {
    console.error('Error createSugerencia:', err)
    res.status(500).json({ error: 'Error al crear sugerencia' })
  }
})

// ─── PUT /api/sugerencias/:id/responder (admin/soporte) ───────────────────────
router.put('/:id/responder', requireRole('admin', 'soporte'), async (req, res) => {
  try {
    const { respuesta, estado } = req.body

    if (!respuesta?.trim()) {
      return res.status(400).json({ error: 'La respuesta es requerida' })
    }

    const estadosValidos = ['pendiente', 'revisada', 'implementada', 'descartada']
    const nuevoEstado = estadosValidos.includes(estado) ? estado : 'revisada'

    if (isMock) {
      const store = getStore()
      const idx = store.sugerencias.findIndex(s => s.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Sugerencia no encontrada' })

      store.sugerencias[idx] = {
        ...store.sugerencias[idx],
        respuesta: respuesta.trim(),
        estado: nuevoEstado
      }
      saveStore(store)

      const suc = store.sucursales.find(s => s.id === store.sugerencias[idx].sucursal_id)
      return res.json({ ...store.sugerencias[idx], sucursal_nombre: suc?.nombre || '—' })
    }

    const { data, error } = await supabase
      .from('sugerencias')
      .update({ respuesta: respuesta.trim(), estado: nuevoEstado })
      .eq('id', req.params.id)
      .select('*, sucursales(nombre)')
      .single()

    if (error) throw error
    return res.json(data)

  } catch (err) {
    console.error('Error responderSugerencia:', err)
    res.status(500).json({ error: 'Error al responder sugerencia' })
  }
})

export default router
