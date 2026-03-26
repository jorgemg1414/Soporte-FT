import { defineStore } from 'pinia'
import api from '../lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    initialized: false
  }),

  actions: {
    async init() {
      const token = localStorage.getItem('auth_token')

      if (token) {
        try {
          const { data } = await api.get('/auth/me')
          // El backend devuelve { id, nombre, rol, sucursal_id, sucursal_nombre }
          this.user = { id: data.id, email: null }
          this.profile = {
            id:              data.id,
            nombre:          data.nombre,
            rol:             data.rol,
            sucursal_id:     data.sucursal_id,
            sucursales:      data.sucursal_nombre
              ? { nombre: data.sucursal_nombre }
              : null
          }
        } catch {
          // Token inválido o expirado: limpiar
          localStorage.removeItem('auth_token')
          this.user    = null
          this.profile = null
        }
      }

      this.initialized = true
    },

    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      // Guardar el JWT en localStorage
      localStorage.setItem('auth_token', data.token)

      this.user = { id: data.user.id, email }
      this.profile = {
        id:          data.user.id,
        nombre:      data.user.nombre,
        rol:         data.user.rol,
        sucursal_id: data.user.sucursal_id,
        sucursales:  data.user.sucursal_nombre
          ? { nombre: data.user.sucursal_nombre }
          : null
      }

      return data
    },

    logout() {
      localStorage.removeItem('auth_token')
      this.user    = null
      this.profile = null
    }
  }
})
