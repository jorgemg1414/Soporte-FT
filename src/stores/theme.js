import { defineStore } from 'pinia'
import { setCssVar } from 'quasar'

// ─── Utilidades de color ──────────────────────────────────────────────────────
function hexToRgb(hex) {
  const c = hex.replace('#', '')
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2,'0')).join('')
}
function darken(hex, pct) {
  const [r,g,b] = hexToRgb(hex); const f = 1 - pct/100
  return rgbToHex(r*f, g*f, b*f)
}
function lighten(hex, pct) {
  const [r,g,b] = hexToRgb(hex); const f = pct/100
  return rgbToHex(r+(255-r)*f, g+(255-g)*f, b+(255-b)*f)
}

// ─── Defaults ────────────────────────────────────────────────────────────────
export const DEFAULTS = {
  primary:    '#1976D2',
  secondary:  '#26A69A',
  accent:     '#9C27B0',
  appName:    'Centro de Soporte',
  cardRadius: 12,
  density:    'normal',
  pageBg:     '#f5f5f5',
}

// ─── Presets ──────────────────────────────────────────────────────────────────
export const PRESETS = [
  { name: 'Azul',    primary: '#1976D2', secondary: '#26A69A', accent: '#9C27B0' },
  { name: 'Índigo',  primary: '#3F51B5', secondary: '#00BCD4', accent: '#E91E63' },
  { name: 'Teal',    primary: '#00796B', secondary: '#1565C0', accent: '#FF6F00' },
  { name: 'Verde',   primary: '#388E3C', secondary: '#0097A7', accent: '#F57C00' },
  { name: 'Morado',  primary: '#7B1FA2', secondary: '#0097A7', accent: '#FFC107' },
  { name: 'Rojo',    primary: '#C62828', secondary: '#00695C', accent: '#1565C0' },
  { name: 'Naranja', primary: '#E64A19', secondary: '#0277BD', accent: '#558B2F' },
  { name: 'Rosa',    primary: '#AD1457', secondary: '#00838F', accent: '#F57F17' },
  { name: 'Gris',    primary: '#37474F', secondary: '#00838F', accent: '#FF6F00' },
]

const STORAGE_KEY = 'app-theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({ ...DEFAULTS }),

  getters: {
    headerGradient: (state) => {
      const from = darken(state.primary, 18)
      const to   = lighten(state.primary, 32)
      return `linear-gradient(135deg, ${from} 0%, ${state.primary} 60%, ${to} 100%)`
    },
    sidebarGradient: (state) => {
      const from = darken(state.primary, 18)
      return `linear-gradient(160deg, ${from} 0%, ${state.primary} 100%)`
    },
    // Devuelve el color primario en formato rgba(r,g,b,opacity)
    primaryAlpha: (state) => (opacity) => {
      const [r,g,b] = hexToRgb(state.primary)
      return `rgba(${r},${g},${b},${opacity})`
    },
  },

  actions: {
    // Aplica todo al DOM + Quasar sin guardar
    _apply(cfg) {
      if (cfg.primary   !== undefined) this.primary   = cfg.primary
      if (cfg.secondary !== undefined) this.secondary = cfg.secondary
      if (cfg.accent    !== undefined) this.accent    = cfg.accent
      if (cfg.appName   !== undefined) this.appName   = cfg.appName
      if (cfg.cardRadius !== undefined) this.cardRadius = cfg.cardRadius
      if (cfg.density   !== undefined) this.density   = cfg.density
      if (cfg.pageBg    !== undefined) this.pageBg    = cfg.pageBg

      setCssVar('primary',   this.primary)
      setCssVar('secondary', this.secondary)
      setCssVar('accent',    this.accent)

      const from = darken(this.primary, 18)
      const to   = lighten(this.primary, 32)
      const root = document.documentElement

      // Gradiente header
      root.style.setProperty('--theme-header-from', from)
      root.style.setProperty('--theme-header-mid',  this.primary)
      root.style.setProperty('--theme-header-to',   to)
      root.style.setProperty('--theme-primary',     this.primary)
      root.style.setProperty('--theme-secondary',   this.secondary)
      root.style.setProperty('--theme-accent',      this.accent)

      // Radio de tarjetas
      root.style.setProperty('--card-radius', `${this.cardRadius}px`)

      // Fondo de página (modo claro)
      root.style.setProperty('--page-bg', this.pageBg)

      // Densidad: clase en <html>
      root.classList.remove('density-compact', 'density-comfortable')
      if (this.density !== 'normal') root.classList.add(`density-${this.density}`)
    },

    setColor(key, value) {
      this._apply({ [key]: value })
    },

    applyPreset(preset) {
      this._apply(preset)
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        primary:    this.primary,
        secondary:  this.secondary,
        accent:     this.accent,
        appName:    this.appName,
        cardRadius: this.cardRadius,
        density:    this.density,
        pageBg:     this.pageBg,
      }))
    },

    reset() {
      this._apply({ ...DEFAULTS })
      localStorage.removeItem(STORAGE_KEY)
    },

    init() {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try { this._apply(JSON.parse(saved)) } catch { this._apply({ ...DEFAULTS }) }
      } else {
        this._apply({ ...DEFAULTS })
      }
    },
  },
})
