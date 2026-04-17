import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

const SESSION_KEY = 'session_redirect'

// Estado del ciclo de refresh para manejar peticiones concurrentes
let isRefreshing = false
let failedQueue = []

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

function saveFormData() {
  const current = window.location.pathname
  const formData = {}
  const form = document.querySelector('form')
  if (form) {
    form.querySelectorAll('input, textarea, select').forEach(input => {
      if (input.name && input.value) formData[input.name] = input.value
    })
  }
  if (Object.keys(formData).length > 0) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ path: current, formData, timestamp: Date.now() }))
  }
}

function redirectToLogin() {
  const current = window.location.pathname
  if (current !== '/login' && current !== '/sucursal-select') {
    saveFormData()
    const esEncargada = current.startsWith('/sucursal')
    window.location.href = esEncargada ? '/sucursal-select' : '/login'
  }
}

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config

    // Solo intentar refresh en 401 y si no fue ya un retry
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // No reintentar refresh si el error viene de refresh/login en sí
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login') || original.url?.includes('/auth/sucursal-login')) {
      redirectToLogin()
      return Promise.reject(error)
    }

    // Si ya hay un refresh en curso, encolar esta petición
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        original._retry = true
        return api(original)
      }).catch(err => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data: refreshData } = await api.post('/auth/refresh')
      if (refreshData?.sessionExpiresAt) {
        window.dispatchEvent(new CustomEvent('session-refreshed', { detail: { sessionExpiresAt: refreshData.sessionExpiresAt } }))
      }
      processQueue(null)
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError)
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export function getSavedFormData() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (Date.now() - data.timestamp < 300000) {
        sessionStorage.removeItem(SESSION_KEY)
        return data
      }
      sessionStorage.removeItem(SESSION_KEY)
    }
  } catch { /* ignore */ }
  return null
}

export default api
