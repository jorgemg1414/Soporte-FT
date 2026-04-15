import { Router } from 'express'
import db from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

const CATEGORIAS_VALIDAS = ['cancelacion_documento', 'cancelacion_portal', 'falla_pvwin', 'falla_computadora', 'otro']

// GET /api/reglas-asignacion — lista todas las reglas con info de técnicos
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.categoria, r.tecnico_ids, r.updated_at, r.updated_by,
             p.nombre as updated_by_nombre
      FROM reglas_asignacion r
      LEFT JOIN profiles p ON r.updated_by = p.id
    `).all()

    const reglas = rows.map(row => {
      const ids = JSON.parse(row.tecnico_ids || '[]')
      const tecnicos = ids.length > 0
        ? db.prepare(`SELECT id, nombre FROM profiles WHERE id IN (${ids.map(() => '?').join(',')})`)
            .all(...ids)
        : []
      return {
        categoria: row.categoria, tecnico_ids: ids, tecnicos,
        updated_at: row.updated_at, updated_by: row.updated_by,
        updated_by_nombre: row.updated_by_nombre || null
      }
    })

    res.json(reglas)
  } catch (err) {
    console.error('Error listando reglas:', err)
    res.status(500).json({ error: 'Error al obtener reglas de asignación' })
  }
})

// PUT /api/reglas-asignacion/:categoria — crea o reemplaza una regla con múltiples técnicos
router.put('/:categoria', (req, res) => {
  const { categoria } = req.params
  const { tecnico_ids } = req.body

  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' })
  }
  if (!Array.isArray(tecnico_ids) || tecnico_ids.length === 0) {
    return res.status(400).json({ error: 'tecnico_ids debe ser un arreglo con al menos un técnico' })
  }

  // Validar que todos los IDs existan y sean soporte/admin
  const placeholders = tecnico_ids.map(() => '?').join(',')
  const encontrados = db.prepare(
    `SELECT id FROM profiles WHERE id IN (${placeholders}) AND rol IN ('soporte','admin')`
  ).all(...tecnico_ids)

  if (encontrados.length !== tecnico_ids.length) {
    return res.status(400).json({ error: 'Uno o más técnicos no son válidos' })
  }

  try {
    db.prepare(`
      INSERT INTO reglas_asignacion (categoria, tecnico_ids, updated_at, updated_by)
      VALUES (?, ?, datetime('now'), ?)
      ON CONFLICT(categoria) DO UPDATE SET
        tecnico_ids = excluded.tecnico_ids,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run(categoria, JSON.stringify(tecnico_ids), req.user.sub)

    const row = db.prepare(`
      SELECT r.categoria, r.tecnico_ids, r.updated_at, r.updated_by, p.nombre as updated_by_nombre
      FROM reglas_asignacion r
      LEFT JOIN profiles p ON r.updated_by = p.id
      WHERE r.categoria = ?
    `).get(categoria)
    const ids = JSON.parse(row.tecnico_ids)
    const tecnicos = db.prepare(`SELECT id, nombre FROM profiles WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)

    res.json({
      categoria: row.categoria, tecnico_ids: ids, tecnicos,
      updated_at: row.updated_at, updated_by: row.updated_by,
      updated_by_nombre: row.updated_by_nombre || null
    })
  } catch (err) {
    console.error('Error guardando regla:', err)
    res.status(500).json({ error: 'Error al guardar la regla' })
  }
})

// DELETE /api/reglas-asignacion/:categoria — elimina una regla
router.delete('/:categoria', (req, res) => {
  try {
    db.prepare('DELETE FROM reglas_asignacion WHERE categoria = ?').run(req.params.categoria)
    res.json({ ok: true })
  } catch (err) {
    console.error('Error eliminando regla:', err)
    res.status(500).json({ error: 'Error al eliminar la regla' })
  }
})

export default router
