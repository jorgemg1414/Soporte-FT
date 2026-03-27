import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// Interceptor de petición: agrega el token JWT al header Authorization
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: si llega un 401, limpia el token y redirige según el rol
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const current = window.location.pathname
      if (current !== '/login' && current !== '/sucursal-select') {
        // Detectar rol por el token actual antes de borrarlo
        let esEncargada = false
        try {
          const token = localStorage.getItem('auth_token')
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]))
            esEncargada = payload.rol === 'encargada'
          }
        } catch { /* ignorar */ }

        localStorage.removeItem('auth_token')
        window.location.href = esEncargada ? '/sucursal-select' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
