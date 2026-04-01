import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true // Enviar cookies httpOnly con cada request
})

// Interceptor de respuesta: si llega un 401, redirigir según el rol
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const current = window.location.pathname
      if (current !== '/login' && current !== '/sucursal-select') {
        // Detectar si era sucursal por la URL actual
        const esEncargada = current.startsWith('/sucursal')
        window.location.href = esEncargada ? '/sucursal-select' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
