import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Estados ────────────────────────────────────────────────────────────────
const ESTADO_COLOR = { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }
const ESTADO_LABEL = { abierto: 'Abierto', en_proceso: 'En Proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const ESTADO_HEX   = { abierto: '#FFA000', en_proceso: '#1976D2', resuelto: '#388E3C', cerrado: '#9E9E9E' }

export function getEstadoColor(estado)   { return ESTADO_COLOR[estado] || 'grey' }
export function getEstadoLabel(estado)   { return ESTADO_LABEL[estado] || estado }
export function getEstadoHex(estado)     { return ESTADO_HEX[estado] || '#ccc' }

// ── Categorías ─────────────────────────────────────────────────────────────
const CAT_ICON  = { cancelacion_documento: 'cancel', cancelacion_portal: 'language', falla_pvwin: 'computer', falla_computadora: 'desktop_windows', otro: 'help_outline' }
const CAT_LABEL = { cancelacion_documento: 'Cancelación Doc. PVWIN', cancelacion_portal: 'Cancelación Doc. Portal', falla_pvwin: 'Falla PVWIN', falla_computadora: 'Falla Equipo', otro: 'Otro' }
const CAT_COLOR = { cancelacion_documento: 'negative', cancelacion_portal: 'deep-orange', falla_pvwin: 'primary', falla_computadora: 'warning', otro: 'grey' }
const CAT_BG    = { cancelacion_documento: 'rgba(193,0,21,0.08)', cancelacion_portal: 'rgba(230,74,25,0.08)', falla_pvwin: 'rgba(25,118,210,0.1)', falla_computadora: 'rgba(242,192,55,0.1)', otro: 'rgba(0,0,0,0.05)' }

export function getCategoryIcon(cat)    { return CAT_ICON[cat] || 'help_outline' }
export function getCategoryLabel(cat)   { return CAT_LABEL[cat] || cat }
export function getCategoryColor(cat)   { return CAT_COLOR[cat] || 'grey' }
export function getCategoryBg(cat)      { return CAT_BG[cat] || 'rgba(0,0,0,0.05)' }

// ── Tipo documento ─────────────────────────────────────────────────────────
const TIPO_DOC_LABEL = { factura: 'Factura', remision: 'Remisión', traspaso: 'Traspaso', compra: 'Compra', nota_credito: 'Nota de Crédito', devolucion: 'Devolución', otro: 'Otro', canjeo_premios: 'Canjeo de Premios', servicios: 'Servicios' }

export function getTipoDocLabel(tipo) { return TIPO_DOC_LABEL[tipo] || tipo }

// ── Roles ──────────────────────────────────────────────────────────────────
const ROL_COLOR = { admin: 'negative', encargada: 'primary', soporte: 'positive' }
const ROL_LABEL = { admin: 'Admin', encargada: 'Encargado/a', soporte: 'Soporte' }

export function getRolColor(rol) { return ROL_COLOR[rol] || 'grey' }
export function getRolLabel(rol) { return ROL_LABEL[rol] || rol }

// ── Fechas ─────────────────────────────────────────────────────────────────
export function formatDate(dateStr, fmt = 'dd/MM/yyyy HH:mm') {
  if (!dateStr) return '—'
  return format(new Date(dateStr), fmt, { locale: es })
}

// ── Títulos automáticos por categoría ──────────────────────────────────────
export const TITULOS_AUTO = {
  cancelacion_documento: 'Cancelación de Documento PVWIN',
  cancelacion_portal:    'Cancelación de Documento Portal',
  falla_pvwin:           'Falla en PVWIN',
  falla_computadora:     'Falla en Equipo / Computadora',
  otro:                  'Otro'
}

// ── Composable (por si se necesita reactivo en el futuro) ──────────────────
export function useTicketHelpers() {
  return {
    getEstadoColor, getEstadoLabel, getEstadoHex,
    getCategoryIcon, getCategoryLabel, getCategoryColor, getCategoryBg,
    getTipoDocLabel,
    getRolColor, getRolLabel,
    formatDate,
    TITULOS_AUTO
  }
}
