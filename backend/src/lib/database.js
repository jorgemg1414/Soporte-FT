import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tickets.db')

// Crear directorio si no existe
import { mkdirSync } from 'fs'
mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

// Optimizaciones SQLite
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sucursales (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    password    TEXT NOT NULL DEFAULT '',
    email       TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    rol         TEXT NOT NULL CHECK(rol IN ('admin','soporte','encargada')),
    sucursal_id TEXT REFERENCES sucursales(id) ON DELETE SET NULL,
    email       TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS users_auth (
    id       TEXT PRIMARY KEY,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id              TEXT PRIMARY KEY,
    folio           TEXT UNIQUE NOT NULL,
    urgente         INTEGER DEFAULT 0,
    titulo          TEXT NOT NULL DEFAULT '',
    categoria       TEXT NOT NULL,
    tipo_documento  TEXT,
    folio_pvwin     TEXT,
    folio_correcto  TEXT,
    descripcion     TEXT DEFAULT '',
    detalle_falla   TEXT,
    tipo_falla      TEXT,
    tipo_traspaso   TEXT,
    foto_cancelar   TEXT,
    foto_correcto   TEXT,
    estado          TEXT NOT NULL DEFAULT 'abierto',
    sucursal_id     TEXT REFERENCES sucursales(id),
    usuario_id      TEXT,
    asignado_a      TEXT,
    resuelto_por_id TEXT,
    resuelto_at     TEXT,
    adjuntos        TEXT DEFAULT '[]',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comentarios (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id  TEXT NOT NULL,
    contenido   TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS historial_tickets (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id  TEXT,
    accion      TEXT NOT NULL,
    detalle     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS catalogos (
    id     TEXT PRIMARY KEY,
    tipo   TEXT NOT NULL,
    label  TEXT NOT NULL,
    value  TEXT NOT NULL,
    grupo  TEXT DEFAULT '',
    orden  INTEGER DEFAULT 0,
    activo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id          TEXT PRIMARY KEY,
    usuario_id  TEXT NOT NULL,
    ticket_id   TEXT,
    mensaje     TEXT NOT NULL,
    tipo        TEXT DEFAULT 'info',
    leida       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notas_internas (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id  TEXT NOT NULL,
    contenido   TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sugerencias (
    id          TEXT PRIMARY KEY,
    usuario_id  TEXT NOT NULL,
    sucursal_id TEXT,
    contenido   TEXT NOT NULL,
    estado      TEXT DEFAULT 'pendiente',
    respuesta   TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_sucursal ON tickets(sucursal_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_estado   ON tickets(estado);
  CREATE INDEX IF NOT EXISTS idx_comentarios_ticket ON comentarios(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_historial_ticket   ON historial_tickets(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_notif_usuario      ON notificaciones(usuario_id, leida);
  CREATE INDEX IF NOT EXISTS idx_notas_ticket       ON notas_internas(ticket_id);
`)

// ─── Migraciones (columnas agregadas después del schema inicial) ──────────────
try { db.prepare("ALTER TABLE sucursales ADD COLUMN email_notificaciones INTEGER DEFAULT 1").run() } catch { /* ya existe */ }

// Tabla de adjuntos
try { db.exec(`
  CREATE TABLE IF NOT EXISTS adjuntos (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    comentario_id TEXT,
    usuario_id  TEXT NOT NULL,
    filename    TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype    TEXT NOT NULL,
    size        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_adjuntos_ticket ON adjuntos(ticket_id);
`) } catch { /* ya existe */ }

// Índice FTS5 para búsqueda full-text
try {
  // Recrear FTS si existe con definición vieja
  const hasFts = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets_fts'").get()
  if (hasFts) {
    // Limpiar y recrear
    db.exec('DROP TABLE IF EXISTS tickets_fts')
    db.exec('DROP TRIGGER IF EXISTS tickets_ai')
    db.exec('DROP TRIGGER IF EXISTS tickets_au')
    db.exec('DROP TRIGGER IF EXISTS tickets_ad')
  }

  db.exec(`
    CREATE VIRTUAL TABLE tickets_fts USING fts5(
      ticket_id,
      titulo,
      descripcion,
      detalle_falla,
      folio,
      tokenize='unicode61 remove_diacritics 2'
    );

    -- Trigger: insert
    CREATE TRIGGER tickets_ai AFTER INSERT ON tickets BEGIN
      INSERT INTO tickets_fts(ticket_id, titulo, descripcion, detalle_falla, folio)
      VALUES (new.id, new.titulo, new.descripcion, new.detalle_falla, new.folio);
    END;

    -- Trigger: update
    CREATE TRIGGER tickets_au AFTER UPDATE ON tickets BEGIN
      INSERT INTO tickets_fts(ticket_id, titulo, descripcion, detalle_falla, folio)
      VALUES (old.id, old.titulo, old.descripcion, old.detalle_falla, old.folio);
      DELETE FROM tickets_fts WHERE ticket_id = old.id;
      INSERT INTO tickets_fts(ticket_id, titulo, descripcion, detalle_falla, folio)
      VALUES (new.id, new.titulo, new.descripcion, new.detalle_falla, new.folio);
    END;

    -- Trigger: delete
    CREATE TRIGGER tickets_ad AFTER DELETE ON tickets BEGIN
      DELETE FROM tickets_fts WHERE ticket_id = old.id;
    END;
  `)

  // Poblar con datos existentes
  db.exec(`INSERT INTO tickets_fts(ticket_id, titulo, descripcion, detalle_falla, folio)
           SELECT id, titulo, descripcion, detalle_falla, folio FROM tickets`)
} catch (e) {
  console.error('[DB] FTS setup error:', e.message)
}

// ─── Seed (solo si la tabla sucursales está vacía) ────────────────────────────
const count = db.prepare('SELECT COUNT(*) as n FROM sucursales').get()

if (count.n === 0) {
  console.log('[DB] Base de datos vacía, insertando datos iniciales...')

  const PS  = bcrypt.hashSync(process.env.MOCK_PASSWORD_SUCURSALES || '3787821528', 10)
  const PA  = bcrypt.hashSync(process.env.MOCK_PASSWORD_ADMIN      || 'admin123', 10)
  const PSP = bcrypt.hashSync(process.env.MOCK_PASSWORD_SOPORTE    || 'sop123', 10)
  const PU  = bcrypt.hashSync(process.env.MOCK_PASSWORD_USUARIOS   || '123456', 10)

  const insertSuc = db.prepare('INSERT INTO sucursales (id, nombre, password, email, created_at) VALUES (?,?,?,?,?)')
  const sucursales = [
    ['suc-gonzalez',    'GONZALEZ'],     ['suc-mezcala',     'MEZCALA'],
    ['suc-lamanga',     'LAMANGA'],       ['suc-colosio',     'COLOSIO'],
    ['suc-jardines',    'JARDINES'],      ['suc-colonia',     'COLONIA'],
    ['suc-capilla',     'CAPILLA'],       ['suc-centro',      'CENTRO'],
    ['suc-aguilillas',  'AGUILILLAS'],    ['suc-pegueros',    'PEGUEROS'],
    ['suc-sanjose',     'SANJOSE'],       ['suc-sanignacio',  'SANIGNACIO'],
    ['suc-zapotlanejo', 'ZAPOTLANEJO'],   ['suc-santabarbara','SANTABARBARA'],
    ['suc-yahualica',   'YAHUALICA'],     ['suc-acatic',      'ACATIC'],
    ['suc-viveros',     'VIVEROS'],       ['suc-arandas',     'ARANDAS'],
    ['suc-mapelo',      'MAPELO']
  ]

  const insertMany = db.transaction(() => {
    for (const [id, nombre] of sucursales) {
      insertSuc.run(id, nombre, PS, '', '2025-01-01T00:00:00Z')
    }

    // Profiles
    const insertProfile = db.prepare('INSERT INTO profiles (id, nombre, rol, sucursal_id, email) VALUES (?,?,?,?,?)')
    insertProfile.run('user-admin',   'Administrador',   'admin',   null, 'admin@ft.com')
    insertProfile.run('user-soporte', 'Soporte Técnico', 'soporte', null, 'soporte@ft.com')
    insertProfile.run('user-jorge',   'Jorge',           'soporte', null, 'jorge@ft.com')
    insertProfile.run('user-elias',   'Elias',           'soporte', null, 'elias@ft.com')
    insertProfile.run('user-jhonny',  'Jhonny',          'soporte', null, 'jhonny@ft.com')

    // Auth
    const insertAuth = db.prepare('INSERT INTO users_auth (id, email, password) VALUES (?,?,?)')
    insertAuth.run('user-admin',   'admin@ft.com',   PA)
    insertAuth.run('user-soporte', 'soporte@ft.com', PSP)
    insertAuth.run('user-jorge',   'jorge@ft.com',   PU)
    insertAuth.run('user-elias',   'elias@ft.com',   PU)
    insertAuth.run('user-jhonny',  'jhonny@ft.com',  PU)

    // Tickets de ejemplo
    const insertTicket = db.prepare(`INSERT INTO tickets
      (id, folio, urgente, titulo, categoria, tipo_documento, folio_pvwin, folio_correcto,
       descripcion, detalle_falla, tipo_falla, estado, sucursal_id, usuario_id,
       asignado_a, adjuntos, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

    insertTicket.run('tk1','R-000001',0,'Cancelar factura duplicada','cancelacion_documento','factura',
      'FAC-2025-1045','FAC-2025-1046','Se generó una factura duplicada al cliente',null,null,
      'abierto','suc-gonzalez','user-gonzalez',null,'[]','2025-03-20T10:00:00Z','2025-03-20T10:00:00Z')

    insertTicket.run('tk2','R-000002',0,'PVWIN no abre módulo de ventas','falla_pvwin',null,
      null,null,'',
      'Al abrir el módulo de ventas aparece error "Acceso denegado" y cierra el programa.',null,
      'en_proceso','suc-mezcala','user-mezcala','user-soporte','[]','2025-03-21T09:30:00Z','2025-03-21T11:00:00Z')

    insertTicket.run('tk3','R-000003',0,'Computadora no enciende','falla_computadora',null,
      null,null,'La computadora de caja 2 no enciende desde esta mañana',
      'Al presionar el botón de encendido no hay respuesta, ni luz ni ventilador.','sin_encendido',
      'resuelto','suc-gonzalez','user-gonzalez','user-jorge','[]','2025-03-22T08:00:00Z','2025-03-23T14:00:00Z')

    // Comentarios
    db.prepare('INSERT INTO comentarios (id, ticket_id, usuario_id, contenido, created_at) VALUES (?,?,?,?,?)')
      .run('com1','tk2','user-soporte','Revisando el problema, parece ser un tema de permisos en el servidor.','2025-03-21T11:00:00Z')

    // Historial
    const insertHist = db.prepare('INSERT INTO historial_tickets (id, ticket_id, usuario_id, accion, detalle, created_at) VALUES (?,?,?,?,?,?)')
    insertHist.run('h1','tk1','user-gonzalez','Ticket creado','Reporte R-000001 creado por Encargada GONZALEZ','2025-03-20T10:00:00Z')
    insertHist.run('h2','tk2','user-mezcala', 'Ticket creado','Reporte R-000002 creado por Encargada MEZCALA','2025-03-21T09:30:00Z')
    insertHist.run('h3','tk2','user-soporte', 'Estado actualizado','Estado cambiado a: En Proceso','2025-03-21T11:00:00Z')
    insertHist.run('h4','tk3','user-gonzalez','Ticket creado','Reporte R-000003 creado por Encargada GONZALEZ','2025-03-22T08:00:00Z')
    insertHist.run('h5','tk3','user-soporte', 'Estado actualizado','Estado cambiado a: Resuelto','2025-03-23T14:00:00Z')

    // Catálogos
    const insertCat = db.prepare('INSERT INTO catalogos (id, tipo, label, value, grupo, orden, activo) VALUES (?,?,?,?,?,?,?)')
    // Tipos de documento
    insertCat.run('td-1','tipos_documento','Factura','factura','',1,1)
    insertCat.run('td-2','tipos_documento','Remisión','remision','',2,1)
    insertCat.run('td-3','tipos_documento','Traspaso','traspaso','',3,1)
    insertCat.run('td-4','tipos_documento','Compra','compra','',4,1)
    insertCat.run('td-5','tipos_documento','Nota de crédito','nota_credito','',5,1)
    insertCat.run('td-6','tipos_documento','Devolución','devolucion','',6,1)
    insertCat.run('td-7','tipos_documento','Otro','otro','',7,1)
    // Tipos de falla equipo
    insertCat.run('tfe-1','tipos_falla_equipo','No enciende','sin_encendido','Computadora',1,1)
    insertCat.run('tfe-2','tipos_falla_equipo','Fallo físico (hardware)','fisico','Computadora',2,1)
    insertCat.run('tfe-3','tipos_falla_equipo','Fallo de software','software','Computadora',3,1)
    insertCat.run('tfe-4','tipos_falla_equipo','Pantalla / Monitor','pantalla','Computadora',4,1)
    insertCat.run('tfe-5','tipos_falla_equipo','Teclado','teclado','Computadora',5,1)
    insertCat.run('tfe-6','tipos_falla_equipo','Mouse','mouse','Computadora',6,1)
    insertCat.run('tfe-7','tipos_falla_equipo','Red / Internet','red','Computadora',7,1)
    insertCat.run('tfe-8','tipos_falla_equipo','Impresora de ticket','impresora_ticket','Impresoras',8,1)
    insertCat.run('tfe-9','tipos_falla_equipo','Impresora de carta','impresora_carta','Impresoras',9,1)
    insertCat.run('tfe-10','tipos_falla_equipo','Impresora de etiquetas','impresora_etiquetas','Impresoras',10,1)
    insertCat.run('tfe-11','tipos_falla_equipo','Scanner / Lector de código','scanner','Periféricos',11,1)
    insertCat.run('tfe-12','tipos_falla_equipo','Lector de tarjetas','lector_tarjetas','Periféricos',12,1)
    insertCat.run('tfe-13','tipos_falla_equipo','Cámara / Webcam','camara','Periféricos',13,1)
    insertCat.run('tfe-14','tipos_falla_equipo','UPS / No Break','ups','Periféricos',14,1)
    insertCat.run('tfe-15','tipos_falla_equipo','Teléfono / Conmutador','telefono','Periféricos',15,1)
    insertCat.run('tfe-16','tipos_falla_equipo','Otro','otro','Otro',16,1)
  })

  insertMany()
  console.log('[DB] Datos iniciales insertados correctamente')
}

// ─── Folio generator ──────────────────────────────────────────────────────────
export function generateFolio() {
  const last = db.prepare("SELECT folio FROM tickets ORDER BY CAST(SUBSTR(folio, 3) AS INTEGER) DESC LIMIT 1").get()
  const seq = last ? parseInt(last.folio.slice(2)) + 1 : 1
  return `R-${String(seq).padStart(6, '0')}`
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Session invalidation (kept in memory, lightweight) ───────────────────────
let _sucursalInvalidatedAt = 0
export function getSucursalInvalidatedAt() { return _sucursalInvalidatedAt }
export function invalidateSucursalSessions() { _sucursalInvalidatedAt = Math.floor(Date.now() / 1000) }

export default db
