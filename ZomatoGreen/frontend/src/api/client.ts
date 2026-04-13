import axios from 'axios'
import { useAuthStore } from '../store/auth'

const api = axios.create({ baseURL: '/api/' })

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    const isAuthRoute = window.location.pathname === '/login' || window.location.pathname === '/register'
    const hadToken = !!useAuthStore.getState().token
    if (err.response?.status === 401 && !isAuthRoute && hadToken) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
