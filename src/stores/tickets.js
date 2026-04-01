import { defineStore } from 'pinia'
import api from '../lib/api'

export const useTicketsStore = defineStore('tickets', {
  state: () => ({
    tickets: [],
    loading: false,
    stats: {},
    error: null
  }),

  actions: {
    async fetchTickets() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/tickets')
        this.tickets = data || []
      } catch (e) {
        this.error = e.message || 'Error al cargar tickets'
      } finally {
        this.loading = false
      }
    },

    async fetchStats() {
      try {
        const { data } = await api.get('/tickets/stats')
        this.stats = data
      } catch { /* silencioso */ }
    },

    async crearTicket(ticketData) {
      const { data } = await api.post('/tickets', ticketData)
      return data
    },

    async actualizarEstado(ticketId, nuevoEstado) {
      const { data } = await api.put(`/tickets/${ticketId}/estado`, { estado: nuevoEstado })
      return data
    },

    async agregarComentario(ticketId, contenido) {
      const { data } = await api.post(`/tickets/${ticketId}/comentarios`, { contenido })
      return data
    }
  }
})
