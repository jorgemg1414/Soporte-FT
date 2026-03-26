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

const initialData = {
  sucursales: [
    { id: 'suc-gonzalez',    nombre: 'GONZALEZ',     created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-mezcala',     nombre: 'MEZCALA',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-lamanga',     nombre: 'LAMANGA',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-colosio',     nombre: 'COLOSIO',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-jardines',    nombre: 'JARDINES',     created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-colonia',     nombre: 'COLONIA',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-capilla',     nombre: 'CAPILLA',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-centro',      nombre: 'CENTRO',       created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-aguilillas',  nombre: 'AGUILILLAS',   created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-pegueros',    nombre: 'PEGUEROS',     created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-sanjose',     nombre: 'SANJOSE',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-sanignacio',  nombre: 'SANIGNACIO',   created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-zapotlanejo', nombre: 'ZAPOTLANEJO',  created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-santabarbara',nombre: 'SANTABARBARA', created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-yahualica',   nombre: 'YAHUALICA',    created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-acatic',      nombre: 'ACATIC',       created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-viveros',     nombre: 'VIVEROS',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-arandas',     nombre: 'ARANDAS',      created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-sistemas',    nombre: 'SISTEMAS',     created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-test',        nombre: 'TEST',         created_at: '2025-01-01T00:00:00Z' },
    { id: 'suc-mapelo',      nombre: 'MAPELO',       created_at: '2025-01-01T00:00:00Z' }
  ],
  profiles: [
    { id: 'user-admin',        nombre: 'Administrador',          rol: 'admin',     sucursal_id: null,               email: 'admin@ft.com' },
    { id: 'user-soporte',      nombre: 'Soporte Técnico',        rol: 'soporte',   sucursal_id: null,               email: 'soporte@ft.com' },
    { id: 'user-gonzalez',     nombre: 'Encargada GONZALEZ',     rol: 'encargada', sucursal_id: 'suc-gonzalez',     email: 'gonzalez@ft.com' },
    { id: 'user-mezcala',      nombre: 'Encargada MEZCALA',      rol: 'encargada', sucursal_id: 'suc-mezcala',      email: 'mezcala@ft.com' },
    { id: 'user-lamanga',      nombre: 'Encargada LAMANGA',      rol: 'encargada', sucursal_id: 'suc-lamanga',      email: 'lamanga@ft.com' },
    { id: 'user-colosio',      nombre: 'Encargada COLOSIO',      rol: 'encargada', sucursal_id: 'suc-colosio',      email: 'colosio@ft.com' },
    { id: 'user-jardines',     nombre: 'Encargada JARDINES',     rol: 'encargada', sucursal_id: 'suc-jardines',     email: 'jardines@ft.com' },
    { id: 'user-colonia',      nombre: 'Encargada COLONIA',      rol: 'encargada', sucursal_id: 'suc-colonia',      email: 'colonia@ft.com' },
    { id: 'user-capilla',      nombre: 'Encargada CAPILLA',      rol: 'encargada', sucursal_id: 'suc-capilla',      email: 'capilla@ft.com' },
    { id: 'user-centro',       nombre: 'Encargada CENTRO',       rol: 'encargada', sucursal_id: 'suc-centro',       email: 'centro@ft.com' },
    { id: 'user-aguilillas',   nombre: 'Encargada AGUILILLAS',   rol: 'encargada', sucursal_id: 'suc-aguilillas',   email: 'aguilillas@ft.com' },
    { id: 'user-pegueros',     nombre: 'Encargada PEGUEROS',     rol: 'encargada', sucursal_id: 'suc-pegueros',     email: 'pegueros@ft.com' },
    { id: 'user-sanjose',      nombre: 'Encargada SANJOSE',      rol: 'encargada', sucursal_id: 'suc-sanjose',      email: 'sanjose@ft.com' },
    { id: 'user-sanignacio',   nombre: 'Encargada SANIGNACIO',   rol: 'encargada', sucursal_id: 'suc-sanignacio',   email: 'sanignacio@ft.com' },
    { id: 'user-zapotlanejo',  nombre: 'Encargada ZAPOTLANEJO',  rol: 'encargada', sucursal_id: 'suc-zapotlanejo',  email: 'zapotlanejo@ft.com' },
    { id: 'user-santabarbara', nombre: 'Encargada SANTABARBARA', rol: 'encargada', sucursal_id: 'suc-santabarbara', email: 'santabarbara@ft.com' },
    { id: 'user-yahualica',    nombre: 'Encargada YAHUALICA',    rol: 'encargada', sucursal_id: 'suc-yahualica',    email: 'yahualica@ft.com' },
    { id: 'user-acatic',       nombre: 'Encargada ACATIC',       rol: 'encargada', sucursal_id: 'suc-acatic',       email: 'acatic@ft.com' },
    { id: 'user-viveros',      nombre: 'Encargada VIVEROS',      rol: 'encargada', sucursal_id: 'suc-viveros',      email: 'viveros@ft.com' },
    { id: 'user-arandas',      nombre: 'Encargada ARANDAS',      rol: 'encargada', sucursal_id: 'suc-arandas',      email: 'arandas@ft.com' },
    { id: 'user-sistemas',     nombre: 'Encargada SISTEMAS',     rol: 'encargada', sucursal_id: 'suc-sistemas',     email: 'sistemas@ft.com' },
    { id: 'user-test',         nombre: 'Encargada TEST',         rol: 'encargada', sucursal_id: 'suc-test',         email: 'test@ft.com' },
    { id: 'user-mapelo',       nombre: 'Encargada MAPELO',       rol: 'encargada', sucursal_id: 'suc-mapelo',       email: 'mapelo@ft.com' }
  ],
  users_auth: [
    { id: 'user-admin',        email: 'admin@ft.com',        password: 'admin123' },
    { id: 'user-soporte',      email: 'soporte@ft.com',      password: 'sop123' },
    { id: 'user-gonzalez',     email: 'gonzalez@ft.com',     password: 'gonzalez' },
    { id: 'user-mezcala',      email: 'mezcala@ft.com',      password: 'mezcala' },
    { id: 'user-lamanga',      email: 'lamanga@ft.com',      password: 'lamanga' },
    { id: 'user-colosio',      email: 'colosio@ft.com',      password: 'colosio' },
    { id: 'user-jardines',     email: 'jardines@ft.com',     password: 'jardines' },
    { id: 'user-colonia',      email: 'colonia@ft.com',      password: 'colonia' },
    { id: 'user-capilla',      email: 'capilla@ft.com',      password: 'capilla' },
    { id: 'user-centro',       email: 'centro@ft.com',       password: 'centro' },
    { id: 'user-aguilillas',   email: 'aguilillas@ft.com',   password: 'aguilillas' },
    { id: 'user-pegueros',     email: 'pegueros@ft.com',     password: 'pegueros' },
    { id: 'user-sanjose',      email: 'sanjose@ft.com',      password: 'sanjose' },
    { id: 'user-sanignacio',   email: 'sanignacio@ft.com',   password: 'sanignacio' },
    { id: 'user-zapotlanejo',  email: 'zapotlanejo@ft.com',  password: 'zapotlanejo' },
    { id: 'user-santabarbara', email: 'santabarbara@ft.com', password: 'santabarbara' },
    { id: 'user-yahualica',    email: 'yahualica@ft.com',    password: 'yahualica' },
    { id: 'user-acatic',       email: 'acatic@ft.com',       password: 'acatic' },
    { id: 'user-viveros',      email: 'viveros@ft.com',      password: 'viveros' },
    { id: 'user-arandas',      email: 'arandas@ft.com',      password: 'arandas' },
    { id: 'user-sistemas',     email: 'sistemas@ft.com',     password: 'sistemas' },
    { id: 'user-test',         email: 'test@ft.com',         password: 'test' },
    { id: 'user-mapelo',       email: 'mapelo@ft.com',       password: 'mapelo' }
  ],
  tickets: [
    {
      id: 'tk1', folio: 'R-000001', titulo: 'Cancelar factura duplicada',
      categoria: 'cancelacion_documento', tipo_documento: 'factura',
      folio_pvwin: 'FAC-2025-1045', folio_correcto: 'FAC-2025-1046',
      descripcion: 'Se generó una factura duplicada al cliente',
      estado: 'abierto', sucursal_id: 'suc-gonzalez', usuario_id: 'user-gonzalez',
      detalle_falla: null, tipo_falla: null,
      created_at: '2025-03-20T10:00:00Z', updated_at: '2025-03-20T10:00:00Z'
    },
    {
      id: 'tk2', folio: 'R-000002', titulo: 'PVWIN no abre módulo de ventas',
      categoria: 'falla_pvwin', tipo_documento: null,
      folio_pvwin: null, folio_correcto: null,
      descripcion: '',
      detalle_falla: 'Al abrir el módulo de ventas aparece error "Acceso denegado" y cierra el programa.',
      tipo_falla: null,
      estado: 'en_proceso', sucursal_id: 'suc-mezcala', usuario_id: 'user-mezcala',
      created_at: '2025-03-21T09:30:00Z', updated_at: '2025-03-21T11:00:00Z'
    },
    {
      id: 'tk3', folio: 'R-000003', titulo: 'Computadora no enciende',
      categoria: 'falla_computadora', tipo_documento: null,
      folio_pvwin: null, folio_correcto: null,
      descripcion: 'La computadora de caja 2 no enciende desde esta mañana',
      detalle_falla: 'Al presionar el botón de encendido no hay respuesta, ni luz ni ventilador.',
      tipo_falla: 'sin_encendido',
      estado: 'resuelto', sucursal_id: 'suc-gonzalez', usuario_id: 'user-gonzalez',
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
  ]
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

// Contador de folio en memoria
let _folioSeq = 3

export function generateFolio() {
  _folioSeq++
  return `R-${String(_folioSeq).padStart(6, '0')}`
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
