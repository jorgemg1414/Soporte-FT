import { defineStore } from 'pinia'
import api from '../lib/api'

export const useTicketsStore = defineStore('tickets', {
  state: () => ({
    tickets: [],
    loading: false,
    stats: {},
    error: null,
    lastFetch: null
  }),

  actions: {
    async fetchTickets() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/tickets')
        this.tickets = data || []
        this.lastFetch = Date.now()
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
      } catch (e) {
        console.error('Error fetching stats:', e)
      }
    },

    async crearTicket(ticketData) {
      const { data } = await api.post('/tickets', ticketData)
      if (data) {
        this.tickets.unshift(data)
        this.lastFetch = Date.now()
      }
      return data
    },

    async actualizarEstado(ticketId, nuevoEstado) {
      const { data } = await api.put(`/tickets/${ticketId}/estado`, { estado: nuevoEstado })
      if (data) {
        const idx = this.tickets.findIndex(t => t.id === ticketId)
        if (idx !== -1) {
          this.tickets[idx] = data
        }
        this.lastFetch = Date.now()
      }
      return data
    },

    async agregarComentario(ticketId, contenido) {
      const { data } = await api.post(`/tickets/${ticketId}/comentarios`, { contenido })
      return data
    }
  }
})
