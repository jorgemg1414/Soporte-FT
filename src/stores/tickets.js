import { defineStore } from 'pinia'
import api from '../lib/api'

export const useTicketsStore = defineStore('tickets', {
  state: () => ({
    tickets: [],
    loading: false,
    stats: {}
  }),

  actions: {
    async fetchTickets() {
      this.loading = true
      try {
        const { data } = await api.get('/tickets')
        this.tickets = data || []
      } finally {
        this.loading = false
      }
    },

    async fetchStats() {
      const { data } = await api.get('/tickets/stats')
      this.stats = data
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
