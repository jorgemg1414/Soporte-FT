import { defineStore } from 'pinia'
import api from '../lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    initialized: false,
    loggingOut: false,
    sessionExpiresAt: null
  }),

  actions: {
    async init() {
      try {
        const { data } = await api.get('/auth/me')
        this.user = { id: data.id }
        this.profile = {
          id:              data.id,
          nombre:          data.nombre,
          rol:             data.rol,
          sucursal_id:     data.sucursal_id,
          sucursales:      data.sucursal_nombre
            ? { id: data.sucursal_id, nombre: data.sucursal_nombre }
            : null
        }
      } catch {
        this.user    = null
        this.profile = null
      }

      this.initialized = true
    },

    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })

      this.user = { id: data.user.id }
      this.profile = {
        id:          data.user.id,
        nombre:      data.user.nombre,
        rol:         data.user.rol,
        sucursal_id: data.user.sucursal_id,
        sucursales:  data.user.sucursal_nombre
          ? { id: data.user.sucursal_id, nombre: data.user.sucursal_nombre }
          : null
      }
      if (data.sessionExpiresAt) this.sessionExpiresAt = data.sessionExpiresAt

      return data
    },

    async logout() {
      this.loggingOut = true
      try { await api.post('/auth/logout') } catch { /* ignorar */ }
      this.user             = null
      this.profile          = null
      this.initialized      = false
      this.loggingOut       = false
      this.sessionExpiresAt = null
    }
  }
})
