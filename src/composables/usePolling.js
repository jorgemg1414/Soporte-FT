import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Ejecuta `fetchFn` cada `interval` ms.
 * Se pausa automáticamente cuando la pestaña está oculta y reanuda al volver.
 * Se detiene si la ruta actual es pública (login/sucursal-select).
 * Devuelve `lastUpdated` (Date) y `secondsAgo` (número reactivo).
 */
export function usePolling(fetchFn, interval = 30000) {
  const lastUpdated  = ref(null)
  const secondsAgo   = ref(0)

  let pollTimer   = null
  let secondTimer = null

  async function ejecutar() {
    // No hacer fetch si estamos en una página pública (sin auth)
    if (window.location.pathname === '/login' || window.location.pathname === '/sucursal-select') {
      detenerPoll()
      return
    }
    await fetchFn()
    lastUpdated.value = new Date()
    secondsAgo.value  = 0
  }

  function iniciarPoll() {
    if (pollTimer) return
    pollTimer = setInterval(ejecutar, interval)
  }

  function detenerPoll() {
    clearInterval(pollTimer)
    pollTimer = null
  }

  function onVisibilityChange() {
    if (document.hidden) {
      detenerPoll()
    } else if (window.location.pathname !== '/login' && window.location.pathname !== '/sucursal-select') {
      ejecutar()     // refresca inmediatamente al volver a la pestaña
      iniciarPoll()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    iniciarPoll()

    // Contador de segundos desde la última actualización
    secondTimer = setInterval(() => {
      if (lastUpdated.value) {
        secondsAgo.value = Math.floor((Date.now() - lastUpdated.value.getTime()) / 1000)
      }
    }, 1000)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    detenerPoll()
    clearInterval(secondTimer)
  })

  return { lastUpdated, secondsAgo }
}
