import db, { genId } from './database.js'

/**
 * Registra una acción administrativa en el audit log.
 * Llámalo después de que la acción se completó exitosamente.
 */
export function logAudit({ usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle, ip }) {
  try {
    db.prepare(`
      INSERT INTO audit_log (id, usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle, ip, created_at)
      VALUES (?,?,?,?,?,?,?,?,datetime('now'))
    `).run(
      genId(),
      usuario_id   || null,
      usuario_nombre || null,
      accion,
      entidad      || null,
      entidad_id   || null,
      detalle      || null,
      ip           || null
    )
  } catch (e) {
    console.error('[AUDIT] Error saving audit log:', e.message)
  }
}
