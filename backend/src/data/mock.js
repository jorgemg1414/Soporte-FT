// Datos mock en memoria para el backend (NO usa localStorage, es Node.js)
// Usuarios de prueba:
//   admin@ft.com          / admin123    → Administrador
//   soporte@ft.com        / sop123      → Soporte Técnico
//   gonzalez@ft.com       / gonzalez    → Encargada GONZALEZ
//   mezcala@ft.com        / mezcala     → Encargada MEZCALA
//   lamanga@ft.com        / lamanga     → Encargada LAMANGA
//   colosio@ft.com        / colosio     → Encargada COLOSIO
//   jardines@ft.com       / jardines    → Encargada JARDINES
//   colonia@ft.com        / colonia     → Encargada COLONIA
//   capilla@ft.com        / capilla     → Encargada CAPILLA
//   centro@ft.com         / centro      → Encargada CENTRO
//   aguilillas@ft.com     / aguilillas  → Encargada AGUILILLAS
//   pegueros@ft.com       / pegueros    → Encargada PEGUEROS
//   sanjose@ft.com        / sanjose     → Encargada SANJOSE
//   sanignacio@ft.com     / sanignacio  → Encargada SANIGNACIO
//   zapotlanejo@ft.com    / zapotlanejo → Encargada ZAPOTLANEJO
//   santabarbara@ft.com   / santabarbara→ Encargada SANTABARBARA
//   yahualica@ft.com      / yahualica   → Encargada YAHUALICA
//   acatic@ft.com         / acatic      → Encargada ACATIC
//   viveros@ft.com        / viveros     → Encargada VIVEROS
//   arandas@ft.com        / arandas     → Encargada ARANDAS
//   sistemas@ft.com       / sistemas    → Encargada SISTEMAS
//   test@ft.com           / test        → Encargada TEST
//   mapelo@ft.com         / mapelo      → Encargada MAPELO

const PS  = process.env.MOCK_PASSWORD_SUCURSALES
const PA  = process.env.MOCK_PASSWORD_ADMIN
const PSP = process.env.MOCK_PASSWORD_SOPORTE
const PU  = process.env.MOCK_PASSWORD_USUARIOS

const initialData = {
  sucursales: [
    { id: 'suc-gonzalez',    nombre: 'GONZALEZ',     password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-mezcala',     nombre: 'MEZCALA',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-lamanga',     nombre: 'LAMANGA',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-colosio',     nombre: 'COLOSIO',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-jardines',    nombre: 'JARDINES',     password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-colonia',     nombre: 'COLONIA',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-capilla',     nombre: 'CAPILLA',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-centro',      nombre: 'CENTRO',       password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-aguilillas',  nombre: 'AGUILILLAS',   password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-pegueros',    nombre: 'PEGUEROS',     password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-sanjose',     nombre: 'SANJOSE',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-sanignacio',  nombre: 'SANIGNACIO',   password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-zapotlanejo', nombre: 'ZAPOTLANEJO',  password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-santabarbara',nombre: 'SANTABARBARA', password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-yahualica',   nombre: 'YAHUALICA',    password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-acatic',      nombre: 'ACATIC',       password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-viveros',     nombre: 'VIVEROS',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-arandas',     nombre: 'ARANDAS',      password: PS, email: '', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-mapelo',      nombre: 'MAPELO',       password: PS, email: '', created_at: '2025-01-01T00:00:00Z' }
  ],
  profiles: [
    { id: 'user-admin',    nombre: 'Administrador',   rol: 'admin',   sucursal_id: null, email: 'admin@ft.com' },
    { id: 'user-soporte',  nombre: 'Soporte Técnico', rol: 'soporte', sucursal_id: null, email: 'soporte@ft.com' },
    { id: 'user-jorge',    nombre: 'Jorge',            rol: 'soporte', sucursal_id: null, email: 'jorge@ft.com' },
    { id: 'user-elias',    nombre: 'Elias',            rol: 'soporte', sucursal_id: null, email: 'elias@ft.com' },
    { id: 'user-jhonny',   nombre: 'Jhonny',           rol: 'soporte', sucursal_id: null, email: 'jhonny@ft.com' }
  ],
  users_auth: [
    { id: 'user-admin',   email: 'admin@ft.com',   password: PA  },
    { id: 'user-soporte', email: 'soporte@ft.com', password: PSP },
    { id: 'user-jorge',   email: 'jorge@ft.com',   password: PU  },
    { id: 'user-elias',   email: 'elias@ft.com',   password: PU  },
    { id: 'user-jhonny',  email: 'jhonny@ft.com',  password: PU  }
  ],
  tickets: [
    {
      id: 'tk1', folio: 'R-000001', urgente: false, titulo: 'Cancelar factura duplicada',
      categoria: 'cancelacion_documento', tipo_documento: 'factura',
      folio_pvwin: 'FAC-2025-1045', folio_correcto: 'FAC-2025-1046',
      descripcion: 'Se generó una factura duplicada al cliente',
      estado: 'abierto', sucursal_id: 'suc-gonzalez', usuario_id: 'user-gonzalez',
      asignado_a: null, adjuntos: [],
      detalle_falla: null, tipo_falla: null,
      created_at: '2025-03-20T10:00:00Z', updated_at: '2025-03-20T10:00:00Z'
    },
    {
      id: 'tk2', folio: 'R-000002', urgente: false, titulo: 'PVWIN no abre módulo de ventas',
      categoria: 'falla_pvwin', tipo_documento: null,
      folio_pvwin: null, folio_correcto: null,
      descripcion: '',
      detalle_falla: 'Al abrir el módulo de ventas aparece error "Acceso denegado" y cierra el programa.',
      tipo_falla: null,
      estado: 'en_proceso', sucursal_id: 'suc-mezcala', usuario_id: 'user-mezcala',
      asignado_a: 'user-soporte', adjuntos: [],
      created_at: '2025-03-21T09:30:00Z', updated_at: '2025-03-21T11:00:00Z'
    },
    {
      id: 'tk3', folio: 'R-000003', urgente: false, titulo: 'Computadora no enciende',
      categoria: 'falla_computadora', tipo_documento: null,
      folio_pvwin: null, folio_correcto: null,
      descripcion: 'La computadora de caja 2 no enciende desde esta mañana',
      detalle_falla: 'Al presionar el botón de encendido no hay respuesta, ni luz ni ventilador.',
      tipo_falla: 'sin_encendido',
      estado: 'resuelto', sucursal_id: 'suc-gonzalez', usuario_id: 'user-gonzalez',
      asignado_a: 'user-jorge', adjuntos: [],
      created_at: '2025-03-22T08:00:00Z', updated_at: '2025-03-23T14:00:00Z'
    }
  ],
  comentarios: [
    {
      id: 'com1', ticket_id: 'tk2', usuario_id: 'user-soporte',
      contenido: 'Revisando el problema, parece ser un tema de permisos en el servidor.',
      created_at: '2025-03-21T11:00:00Z'
    }
  ],
  historial_tickets: [
    { id: 'h1', ticket_id: 'tk1', usuario_id: 'user-gonzalez',  accion: 'Ticket creado',      detalle: 'Reporte R-000001 creado por Encargada GONZALEZ',  created_at: '2025-03-20T10:00:00Z' },
    { id: 'h2', ticket_id: 'tk2', usuario_id: 'user-mezcala',   accion: 'Ticket creado',      detalle: 'Reporte R-000002 creado por Encargada MEZCALA',   created_at: '2025-03-21T09:30:00Z' },
    { id: 'h3', ticket_id: 'tk2', usuario_id: 'user-soporte',   accion: 'Estado actualizado', detalle: 'Estado cambiado a: En Proceso',                   created_at: '2025-03-21T11:00:00Z' },
    { id: 'h4', ticket_id: 'tk3', usuario_id: 'user-gonzalez',  accion: 'Ticket creado',      detalle: 'Reporte R-000003 creado por Encargada GONZALEZ',  created_at: '2025-03-22T08:00:00Z' },
    { id: 'h5', ticket_id: 'tk3', usuario_id: 'user-soporte',   accion: 'Estado actualizado', detalle: 'Estado cambiado a: Resuelto',                     created_at: '2025-03-23T14:00:00Z' }
  ],

  catalogos: [
    // ── Tipos de documento (cancelación) ──
    { id: 'td-1', tipo: 'tipos_documento',     label: 'Factura',                  value: 'factura',              grupo: '',            orden: 1,  activo: true },
    { id: 'td-2', tipo: 'tipos_documento',     label: 'Remisión',                 value: 'remision',             grupo: '',            orden: 2,  activo: true },
    { id: 'td-3', tipo: 'tipos_documento',     label: 'Traspaso',                 value: 'traspaso',             grupo: '',            orden: 3,  activo: true },
    { id: 'td-4', tipo: 'tipos_documento',     label: 'Compra',                   value: 'compra',               grupo: '',            orden: 4,  activo: true },
    { id: 'td-5', tipo: 'tipos_documento',     label: 'Nota de crédito',          value: 'nota_credito',         grupo: '',            orden: 5,  activo: true },
    { id: 'td-6', tipo: 'tipos_documento',     label: 'Devolución',               value: 'devolucion',           grupo: '',            orden: 6,  activo: true },
    { id: 'td-7', tipo: 'tipos_documento',     label: 'Otro',                     value: 'otro',                 grupo: '',            orden: 7,  activo: true },

    // ── Tipos de falla de equipo ──
    { id: 'tfe-1',  tipo: 'tipos_falla_equipo', label: 'No enciende',              value: 'sin_encendido',        grupo: 'Computadora', orden: 1,  activo: true },
    { id: 'tfe-2',  tipo: 'tipos_falla_equipo', label: 'Fallo físico (hardware)',  value: 'fisico',               grupo: 'Computadora', orden: 2,  activo: true },
    { id: 'tfe-3',  tipo: 'tipos_falla_equipo', label: 'Fallo de software',        value: 'software',             grupo: 'Computadora', orden: 3,  activo: true },
    { id: 'tfe-4',  tipo: 'tipos_falla_equipo', label: 'Pantalla / Monitor',       value: 'pantalla',             grupo: 'Computadora', orden: 4,  activo: true },
    { id: 'tfe-5',  tipo: 'tipos_falla_equipo', label: 'Teclado',                  value: 'teclado',              grupo: 'Computadora', orden: 5,  activo: true },
    { id: 'tfe-6',  tipo: 'tipos_falla_equipo', label: 'Mouse',                    value: 'mouse',                grupo: 'Computadora', orden: 6,  activo: true },
    { id: 'tfe-7',  tipo: 'tipos_falla_equipo', label: 'Red / Internet',           value: 'red',                  grupo: 'Computadora', orden: 7,  activo: true },
    { id: 'tfe-8',  tipo: 'tipos_falla_equipo', label: 'Impresora de ticket',      value: 'impresora_ticket',     grupo: 'Impresoras',  orden: 8,  activo: true },
    { id: 'tfe-9',  tipo: 'tipos_falla_equipo', label: 'Impresora de carta',       value: 'impresora_carta',      grupo: 'Impresoras',  orden: 9,  activo: true },
    { id: 'tfe-10', tipo: 'tipos_falla_equipo', label: 'Impresora de etiquetas',   value: 'impresora_etiquetas',  grupo: 'Impresoras',  orden: 10, activo: true },
    { id: 'tfe-11', tipo: 'tipos_falla_equipo', label: 'Scanner / Lector de código',value: 'scanner',             grupo: 'Periféricos', orden: 11, activo: true },
    { id: 'tfe-12', tipo: 'tipos_falla_equipo', label: 'Lector de tarjetas',       value: 'lector_tarjetas',      grupo: 'Periféricos', orden: 12, activo: true },
    { id: 'tfe-13', tipo: 'tipos_falla_equipo', label: 'Cámara / Webcam',          value: 'camara',               grupo: 'Periféricos', orden: 13, activo: true },
    { id: 'tfe-14', tipo: 'tipos_falla_equipo', label: 'UPS / No Break',           value: 'ups',                  grupo: 'Periféricos', orden: 14, activo: true },
    { id: 'tfe-15', tipo: 'tipos_falla_equipo', label: 'Teléfono / Conmutador',    value: 'telefono',             grupo: 'Periféricos', orden: 15, activo: true },
    { id: 'tfe-16', tipo: 'tipos_falla_equipo', label: 'Otro',                     value: 'otro',                 grupo: 'Otro',        orden: 16, activo: true }
  ],

  notificaciones: [],

  notas_internas: [],

  sugerencias: []
}

// Store en memoria (se inicializa una sola vez al arrancar el servidor)
let _store = null

export function getStore() {
  if (!_store) {
    _store = JSON.parse(JSON.stringify(initialData))
  }
  return _store
}

export function saveStore(newStore) {
  _store = newStore
}

// Timestamp de invalidación global para sesiones de sucursales (Unix segundos)
let _sucursalInvalidatedAt = 0

export function getSucursalInvalidatedAt() { return _sucursalInvalidatedAt }
export function invalidateSucursalSessions() { _sucursalInvalidatedAt = Math.floor(Date.now() / 1000) }

// Contador de folio en memoria
let _folioSeq = 3

export function generateFolio() {
  _folioSeq++
  return `R-${String(_folioSeq).padStart(6, '0')}`
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
