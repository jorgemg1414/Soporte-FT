import axios from 'axios'
import { useRouter } from 'vue-router'

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

// Interceptor de respuesta: si llega un 401, limpia el token y redirige a /login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      // Redirigir usando window.location para no depender del router de Vue
      // (este archivo puede importarse fuera del contexto de componentes)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
