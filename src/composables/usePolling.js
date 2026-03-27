import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Ejecuta `fetchFn` cada `interval` ms.
 * Se pausa automáticamente cuando la pestaña está oculta y reanuda al volver.
 * Devuelve `lastUpdated` (Date) y `secondsAgo` (número reactivo).
 */
export function usePolling(fetchFn, interval = 30000) {
  const lastUpdated  = ref(null)
  const secondsAgo   = ref(0)

  let pollTimer   = null
  let secondTimer = null

  async function ejecutar() {
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
    } else {
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
