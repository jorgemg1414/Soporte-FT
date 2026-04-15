import { mkdirSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tickets.db')
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups')
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14')
const INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24')

mkdirSync(BACKUP_DIR, { recursive: true })

function runBackup() {
  const fecha = new Date().toISOString().slice(0, 10)
  const target = path.join(BACKUP_DIR, `tickets-${fecha}.db`)
  try {
    // Usar la API de backup de SQLite: asegura copia consistente aun con writes concurrentes
    db.backup(target)
      .then(() => {
        console.log(`[Backup] OK → ${target}`)
        limpiarAntiguos()
      })
      .catch(err => {
        console.error('[Backup] API falló, intentando copia de archivo:', err.message)
        try {
          copyFileSync(DB_PATH, target)
          console.log(`[Backup] Copia de archivo OK → ${target}`)
          limpiarAntiguos()
        } catch (e) {
          console.error('[Backup] Error al copiar archivo:', e.message)
        }
      })
  } catch (err) {
    console.error('[Backup] Error inesperado:', err.message)
  }
}

function limpiarAntiguos() {
  try {
    const ahora = Date.now()
    const limite = RETENTION_DAYS * 24 * 3600 * 1000
    const archivos = readdirSync(BACKUP_DIR).filter(f => f.startsWith('tickets-') && f.endsWith('.db'))
    let eliminados = 0
    for (const f of archivos) {
      const fp = path.join(BACKUP_DIR, f)
      const stat = statSync(fp)
      if (ahora - stat.mtimeMs > limite) {
        unlinkSync(fp)
        eliminados++
      }
    }
    if (eliminados > 0) console.log(`[Backup] ${eliminados} backup(s) antiguos eliminados (>${RETENTION_DAYS} días)`)
  } catch (err) {
    console.error('[Backup] Error al limpiar antiguos:', err.message)
  }
}

export function startBackupScheduler() {
  // Primera ejecución a los 30 segundos (da tiempo a que arranque todo)
  setTimeout(runBackup, 30 * 1000)
  // Luego cada INTERVAL_HOURS horas
  setInterval(runBackup, INTERVAL_HOURS * 3600 * 1000)
  console.log(`[Backup] Programado cada ${INTERVAL_HOURS}h, retención ${RETENTION_DAYS} días`)
}
