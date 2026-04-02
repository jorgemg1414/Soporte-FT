import { onMounted, onUnmounted } from 'vue'
import { useTicketsStore } from '../stores/tickets'
import { useAuthStore } from '../stores/auth'

/**
 * Conecta al stream SSE del servidor y actualiza el store de tickets
 * en tiempo real cuando ocurren cambios.
 */
export function useEventos() {
  const ticketsStore = useTicketsStore()
  const authStore    = useAuthStore()
  let source  = null
  let retryTimer = null
  let intentos = 0

  function connect() {
    if (!authStore.user) return

    source = new EventSource('/api/eventos', { withCredentials: true })

    source.addEventListener('conectado', () => {
      intentos = 0
    })

    // Nuevo ticket creado en cualquier sucursal
    source.addEventListener('ticket_nuevo', () => {
      ticketsStore.fetchTickets()
      ticketsStore.fetchStats()
    })

    // Ticket actualizado (estado, asignación, urgencia)
    source.addEventListener('ticket_actualizado', () => {
      ticketsStore.fetchTickets()
      ticketsStore.fetchStats()
    })

    source.onerror = () => {
      source?.close()
      source = null
      // Reconexión exponencial: 3s, 6s, 12s, máximo 30s
      const delay = Math.min(3000 * Math.pow(2, intentos), 30000)
      intentos++
      retryTimer = setTimeout(connect, delay)
    }
  }

  onMounted(connect)

  onUnmounted(() => {
    clearTimeout(retryTimer)
    source?.close()
    source = null
  })
}
